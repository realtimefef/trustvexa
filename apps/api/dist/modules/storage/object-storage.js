import * as fs from 'fs';
import * as path from 'path';
/** Deterministic object key for a deal document (no PII in the path). */
export function documentKey(dealId, kind, id) {
    return `documents/${kind}/${dealId}/${id}.pdf`;
}
function readS3Env(env) {
    const endpoint = env.S3_ENDPOINT;
    const bucket = env.S3_BUCKET;
    const accessKeyId = env.S3_ACCESS_KEY_ID;
    const secretAccessKey = env.S3_SECRET_ACCESS_KEY;
    if (!endpoint || !bucket || !accessKeyId || !secretAccessKey)
        return null;
    return {
        endpoint,
        region: env.S3_REGION ?? 'auto',
        bucket,
        accessKeyId,
        secretAccessKey,
    };
}
async function streamToBuffer(stream) {
    if (stream instanceof Buffer)
        return stream;
    if (typeof stream === 'string')
        return Buffer.from(stream);
    // S3 GetObject Body can expose transformToByteArray() (AWS SDK v3 streaming).
    if (stream !== null &&
        typeof stream === 'object' &&
        'transformToByteArray' in stream &&
        typeof stream.transformToByteArray === 'function') {
        const arr = await stream.transformToByteArray();
        return Buffer.from(arr.buffer);
    }
    return new Promise((resolve, reject) => {
        const chunks = [];
        const readable = stream;
        readable.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
        readable.on('error', (err) => reject(err));
        readable.on('end', () => resolve(Buffer.concat(chunks)));
    });
}
class S3ObjectStorage {
    configured = true;
    cfg;
    client = null;
    mod = null;
    constructor(cfg) {
        this.cfg = cfg;
    }
    /** Lazily import the SDK and construct the client on first write. */
    async ensureClient() {
        if (this.client === null || this.mod === null) {
            const specifier = '@aws-sdk/client-s3';
            const mod = (await import(specifier));
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
    async put(key, bytes, contentType) {
        const { client, mod } = await this.ensureClient();
        await client.send(new mod.PutObjectCommand({
            Bucket: this.cfg.bucket,
            Key: key,
            Body: bytes,
            ContentType: contentType,
            ServerSideEncryption: 'AES256',
        }));
        return { stored: true, key };
    }
    async get(key) {
        try {
            const { client, mod } = await this.ensureClient();
            const response = (await client.send(new mod.GetObjectCommand({
                Bucket: this.cfg.bucket,
                Key: key,
            })));
            if (!response.Body)
                return null;
            return await streamToBuffer(response.Body);
        }
        catch (err) {
            if (err !== null &&
                typeof err === 'object' &&
                ('name' in err || 'code' in err) &&
                (err.name === 'NoSuchKey' ||
                    err.code === 'NoSuchKey')) {
                return null;
            }
            throw err;
        }
    }
}
class LocalObjectStorage {
    configured = false;
    baseDir;
    constructor() {
        this.baseDir = path.resolve(process.cwd(), 'uploads');
    }
    getFilePath(key) {
        const fullPath = path.resolve(this.baseDir, key);
        const resolvedBase = path.resolve(this.baseDir) + path.sep;
        if (!fullPath.startsWith(resolvedBase)) {
            throw new Error('Path traversal detected');
        }
        return fullPath;
    }
    async put(key, bytes, _contentType) {
        try {
            const filePath = this.getFilePath(key);
            await fs.promises.mkdir(path.dirname(filePath), { recursive: true });
            await fs.promises.writeFile(filePath, bytes);
            return { stored: true, key };
        }
        catch (err) {
            console.error('LocalObjectStorage.put error:', err);
            return { stored: false, key };
        }
    }
    async get(key) {
        try {
            const filePath = this.getFilePath(key);
            if (!fs.existsSync(filePath))
                return null;
            return await fs.promises.readFile(filePath);
        }
        catch (err) {
            console.error('LocalObjectStorage.get error:', err);
            return null;
        }
    }
}
let cached = null;
/** Return the process-wide object storage, creating it lazily on first use. */
export function getObjectStorage() {
    if (cached === null) {
        const cfg = readS3Env(process.env);
        cached = cfg === null ? new LocalObjectStorage() : new S3ObjectStorage(cfg);
    }
    return cached;
}
/** Test helper: reset the memoized storage instance. */
export function resetObjectStorageCache() {
    cached = null;
}
//# sourceMappingURL=object-storage.js.map