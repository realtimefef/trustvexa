import * as fs from 'fs';
import * as path from 'path';

/**
 * Object-storage seam for rendered documents and media (task 7.8 / 9.2).
 *
 * Documents (deal agreements, dispute decisions, receipts) are rendered as
 * bytes in the service layer and persisted here under a deterministic key. The
 * concrete backend is an S3-compatible store (Render object storage / MinIO /
 * AWS S3) configured purely from environment secrets — no credentials in code.
 *
 * The adapter is env-gated: when the `S3_*` secrets are present a real
 * `S3Client` is created; otherwise a stub reports `configured: false` and
 * `put`/`get` fall back to local disk storage under `apps/api/uploads/`.
 *
 * `@aws-sdk/client-s3` is an *optional* runtime dependency: it is loaded via a
 * lazy dynamic import only when an S3 backend is actually configured.
 */

interface S3ClientLike {
  send(command: unknown): Promise<unknown>;
}
interface S3Module {
  S3Client: new (config: unknown) => S3ClientLike;
  PutObjectCommand: new (input: unknown) => unknown;
  GetObjectCommand: new (input: unknown) => unknown;
}

export interface PutResult {
  /** True when the bytes were durably written to the object store. */
  readonly stored: boolean;
  /** The key the object was (or would be) stored under. */
  readonly key: string;
}

export interface ObjectStorage {
  /** True when an S3-compatible backend is configured. */
  readonly configured: boolean;
  /** Persist bytes under `key`. */
  put(key: string, bytes: Buffer, contentType: string): Promise<PutResult>;
  /** Retrieve bytes under `key`. */
  get(key: string): Promise<Buffer | null>;
}

/** Deterministic object key for a deal document (no PII in the path). */
export function documentKey(dealId: string, kind: string, id: string): string {
  return `documents/${kind}/${dealId}/${id}.pdf`;
}

interface S3Env {
  endpoint: string;
  region: string;
  bucket: string;
  accessKeyId: string;
  secretAccessKey: string;
}

function readS3Env(env: NodeJS.ProcessEnv): S3Env | null {
  const endpoint = env.S3_ENDPOINT;
  const bucket = env.S3_BUCKET;
  const accessKeyId = env.S3_ACCESS_KEY_ID;
  const secretAccessKey = env.S3_SECRET_ACCESS_KEY;
  if (!endpoint || !bucket || !accessKeyId || !secretAccessKey) return null;
  return {
    endpoint,
    region: env.S3_REGION ?? 'auto',
    bucket,
    accessKeyId,
    secretAccessKey,
  };
}

async function streamToBuffer(stream: unknown): Promise<Buffer> {
  if (stream instanceof Buffer) return stream;
  if (typeof stream === 'string') return Buffer.from(stream);
  // S3 GetObject Body can expose transformToByteArray() (AWS SDK v3 streaming).
  if (
    stream !== null &&
    typeof stream === 'object' &&
    'transformToByteArray' in stream &&
    typeof (stream as Record<string, unknown>).transformToByteArray === 'function'
  ) {
    const arr = await (
      stream as { transformToByteArray(): Promise<Uint8Array> }
    ).transformToByteArray();
    return Buffer.from(arr.buffer);
  }
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    const readable = stream as NodeJS.ReadableStream;
    readable.on('data', (chunk: unknown) => chunks.push(Buffer.from(chunk as Uint8Array)));
    readable.on('error', (err: Error) => reject(err));
    readable.on('end', () => resolve(Buffer.concat(chunks)));
  });
}

class S3ObjectStorage implements ObjectStorage {
  readonly configured = true;
  private readonly cfg: S3Env;
  private client: S3ClientLike | null = null;
  private mod: S3Module | null = null;

  constructor(cfg: S3Env) {
    this.cfg = cfg;
  }

  /** Lazily import the SDK and construct the client on first write. */
  private async ensureClient(): Promise<{ client: S3ClientLike; mod: S3Module }> {
    if (this.client === null || this.mod === null) {
      const specifier = '@aws-sdk/client-s3';
      const mod = (await import(specifier)) as unknown as S3Module;
      this.mod = mod;
      this.client = new mod.S3Client({
        endpoint: this.cfg.endpoint,
        region: this.cfg.region,
        forcePathStyle: true,
        credentials: {
          accessKeyId: this.cfg.accessKeyId,
          secretAccessKey: this.cfg.secretAccessKey,
        },
      });
    }
    return { client: this.client, mod: this.mod };
  }

  async put(key: string, bytes: Buffer, contentType: string): Promise<PutResult> {
    const { client, mod } = await this.ensureClient();
    await client.send(
      new mod.PutObjectCommand({
        Bucket: this.cfg.bucket,
        Key: key,
        Body: bytes,
        ContentType: contentType,
        ServerSideEncryption: 'AES256',
      }),
    );
    return { stored: true, key };
  }

  async get(key: string): Promise<Buffer | null> {
    try {
      const { client, mod } = await this.ensureClient();
      const response = (await client.send(
        new mod.GetObjectCommand({
          Bucket: this.cfg.bucket,
          Key: key,
        }),
      )) as { Body?: unknown };
      if (!response.Body) return null;
      return await streamToBuffer(response.Body);
    } catch (err) {
      if (
        err !== null &&
        typeof err === 'object' &&
        ('name' in err || 'code' in err) &&
        ((err as { name?: string }).name === 'NoSuchKey' ||
          (err as { code?: string }).code === 'NoSuchKey')
      ) {
        return null;
      }
      throw err;
    }
  }
}

class LocalObjectStorage implements ObjectStorage {
  readonly configured = false;
  private readonly baseDir: string;

  constructor() {
    this.baseDir = path.resolve(process.cwd(), 'uploads');
  }

  private getFilePath(key: string): string {
    const fullPath = path.resolve(this.baseDir, key);
    const resolvedBase = path.resolve(this.baseDir) + path.sep;
    if (!fullPath.startsWith(resolvedBase)) {
      throw new Error('Path traversal detected');
    }
    return fullPath;
  }

  async put(key: string, bytes: Buffer, _contentType: string): Promise<PutResult> {
    try {
      const filePath = this.getFilePath(key);
      await fs.promises.mkdir(path.dirname(filePath), { recursive: true });
      await fs.promises.writeFile(filePath, bytes);
      return { stored: true, key };
    } catch (err) {
      console.error('LocalObjectStorage.put error:', err);
      return { stored: false, key };
    }
  }

  async get(key: string): Promise<Buffer | null> {
    try {
      const filePath = this.getFilePath(key);
      if (!fs.existsSync(filePath)) return null;
      return await fs.promises.readFile(filePath);
    } catch (err) {
      console.error('LocalObjectStorage.get error:', err);
      return null;
    }
  }
}

let cached: ObjectStorage | null = null;

/** Return the process-wide object storage, creating it lazily on first use. */
export function getObjectStorage(): ObjectStorage {
  if (cached === null) {
    const cfg = readS3Env(process.env);
    cached = cfg === null ? new LocalObjectStorage() : new S3ObjectStorage(cfg);
  }
  return cached;
}

/** Test helper: reset the memoized storage instance. */
export function resetObjectStorageCache(): void {
  cached = null;
}
