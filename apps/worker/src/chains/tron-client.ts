/**
 * Tron deposit-watcher adapter, backed by `tronweb`.
 *
 * `tronweb` is an OPTIONAL runtime dependency loaded only here through a lazy
 * dynamic `import(variableSpecifier)`, so the worker builds and typechecks with
 * zero new dependencies. If the package is missing the import throws and
 * {@link loadTronClient} resolves to `null`, signalling the watcher to skip
 * Tron (manual tx-hash verification remains the fallback).
 *
 * Confirmations are derived from the difference between the current block and
 * the transaction's block (Tron's 20-confirmation threshold lives in the shared
 * API logic). Enumerating historical inbound transfers on Tron requires the
 * TronGrid HTTP indexer rather than a full-node RPC; that integration is gated
 * separately, so until it is configured `getIncomingTransfers` reports nothing
 * and crediting falls back to manual tx-hash verification.
 */
import type { ChainClient, ObservedTransfer } from './chain-client.js';

/** Minimal structural view of the `tronweb` slice we use. */
interface TronBlockHeaderRawData {
  readonly number?: number;
}
interface TronBlock {
  readonly block_header?: { readonly raw_data?: TronBlockHeaderRawData };
}
interface TronTransactionInfo {
  readonly blockNumber?: number;
  readonly receipt?: { readonly result?: string };
}
interface TronTrx {
  getCurrentBlock(): Promise<TronBlock>;
  getTransactionInfo(txId: string): Promise<TronTransactionInfo | null>;
}
interface TronWebInstance {
  readonly trx: TronTrx;
}
interface TronWebModule {
  // tronweb exports a constructor either as default or as a named `TronWeb`.
  default?: new (options: { fullHost: string }) => TronWebInstance;
  TronWeb?: new (options: { fullHost: string }) => TronWebInstance;
}

function resolveCtor(
  mod: TronWebModule,
): (new (o: { fullHost: string }) => TronWebInstance) | null {
  return mod.default ?? mod.TronWeb ?? null;
}

class TronChainClient implements ChainClient {
  readonly network = 'TRON' as const;
  private readonly tron: TronWebInstance;
  private readonly urls: string[];

  constructor(tron: TronWebInstance, urls: string[]) {
    this.tron = tron;
    this.urls = urls;
  }

  // Enumeration requires the TronGrid HTTP indexer (gated separately).
  async getIncomingTransfers(address: string, coin: string): Promise<ObservedTransfer[]> {
    const baseUrl = getTronGridBaseUrl(this.urls);
    const url = `${baseUrl}/v1/accounts/${address}/transactions/trc20`;

    const headers: Record<string, string> = {
      'Accept': 'application/json',
    };
    const apiKey = process.env.TRONWEB_API_KEY;
    if (apiKey) {
      headers['TRON-PRO-API-KEY'] = apiKey;
    }

    try {
      const response = await fetch(url, { headers });
      if (!response.ok) {
        throw new Error(`TronGrid returned status ${response.status}`);
      }
      const body = (await response.json()) as { success?: boolean; data?: unknown[] };
      if (!body || !body.success || !Array.isArray(body.data)) {
        return [];
      }

      // Fetch current block number to compute confirmations
      let currentBlock = 0;
      try {
        const current = await this.tron.trx.getCurrentBlock();
        currentBlock = current.block_header?.raw_data?.number ?? 0;
      } catch {
        // Fallback
      }

      const transfers: ObservedTransfer[] = [];
      for (const txRaw of body.data) {
        // Cast to a typed interface — TronGrid response items are plain objects.
        const tx = txRaw as {
          to?: string;
          value?: string;
          block_number?: number | string;
          transaction_id?: string;
          token_info?: { address?: string };
        };
        if (!tx.to || tx.to !== address) continue;
        if (!tx.value) continue;

        let amount: bigint;
        try {
          amount = BigInt(tx.value);
        } catch {
          continue;
        }

        const blockNumber = tx.block_number != null ? Number(tx.block_number) : null;
        let confirmationsCount = 0;
        if (blockNumber !== null && currentBlock > 0) {
          confirmationsCount = Math.max(0, currentBlock - blockNumber + 1);
        }

        const entry: ObservedTransfer = {
          txHash: tx.transaction_id ?? '',
          outputIndex: 0,
          coin,
          network: 'TRON',
          amountSmallestUnit: amount,
          confirmations: confirmationsCount,
        };
        if (tx.token_info?.address !== undefined) {
          (entry as { tokenContractAddress?: string }).tokenContractAddress = tx.token_info.address;
        }
        transfers.push(entry);
      }
      return transfers;
    } catch (err) {
      console.error('Failed to get incoming TRC-20 transfers from TronGrid:', err);
      return [];
    }
  }

  async getConfirmations(txHash: string): Promise<number> {
    const info = await this.tron.trx.getTransactionInfo(txHash);
    const txBlock = info?.blockNumber;
    if (txBlock === undefined || txBlock <= 0) return 0; // unconfirmed / unknown
    const current = await this.tron.trx.getCurrentBlock();
    const tip = current.block_header?.raw_data?.number ?? 0;
    return Math.max(0, tip - txBlock + 1);
  }
}

function getTronGridBaseUrl(rpcUrls: string[]): string {
  for (const url of rpcUrls) {
    if (url.includes('shasta')) {
      return 'https://api.shasta.trongrid.io';
    }
    if (url.includes('nile')) {
      return 'https://nile.trongrid.io';
    }
  }
  return 'https://api.trongrid.io';
}

class FailoverTronTrx implements TronTrx {
  private readonly instances: TronWebInstance[];
  private currentIndex = 0;

  constructor(urls: string[], Ctor: new (o: { fullHost: string }) => TronWebInstance) {
    this.instances = urls.map((url) => new Ctor({ fullHost: url }));
  }

  private async executeWithFailover<T>(fn: (trx: TronTrx) => Promise<T>): Promise<T> {
    let lastError: unknown;
    for (let i = 0; i < this.instances.length; i += 1) {
      const idx = (this.currentIndex + i) % this.instances.length;
      const instance = this.instances[idx];
      try {
        const result = await fn(instance!.trx);
        this.currentIndex = idx;
        return result;
      } catch (err) {
        lastError = err;
      }
    }
    throw lastError;
  }

  getCurrentBlock(): Promise<TronBlock> {
    return this.executeWithFailover((t) => t.getCurrentBlock());
  }

  getTransactionInfo(txId: string): Promise<TronTransactionInfo | null> {
    return this.executeWithFailover((t) => t.getTransactionInfo(txId));
  }
}

/**
 * Build a Tron client, lazily importing `tronweb`. Returns `null` when the
 * library is unavailable so the watcher can skip the chain.
 */
export async function loadTronClient(rpcUrl: string | string[]): Promise<ChainClient | null> {
  try {
    const specifier = 'tronweb';
    const mod = (await import(specifier)) as unknown as TronWebModule;
    const Ctor = resolveCtor(mod);
    if (Ctor === null) return null;
    const urls = Array.isArray(rpcUrl) ? rpcUrl : [rpcUrl];
    const trx = new FailoverTronTrx(urls, Ctor);
    return new TronChainClient({ trx }, urls);
  } catch {
    return null;
  }
}
