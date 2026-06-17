/**
 * EVM deposit-watcher adapter (ETH + BNB), backed by `ethers`.
 *
 * `ethers` is an OPTIONAL runtime dependency: it is loaded only here, via a
 * lazy dynamic `import(variableSpecifier)`, so the worker builds and typechecks
 * with zero new dependencies. If the package is not installed the import throws
 * and {@link loadEvmClient} resolves to `null`, signalling the watcher to skip
 * the chain (manual tx-hash verification remains the fallback).
 *
 * Only the slice of `ethers` actually used is modelled by the local structural
 * interfaces below — the real library is never referenced at the type level.
 * Native-coin transfers are detected by scanning a bounded window of recent
 * blocks; ERC-20 (token) transfers via the standard `Transfer(address,address,
 * uint256)` log topic filtered to the watched address.
 */
import type { ChainClient, Network, ObservedTransfer } from './chain-client.js';

/** Minimal structural view of the `ethers` slice we use. */
interface EvmTransaction {
  readonly hash: string;
  readonly to: string | null;
  readonly value: bigint;
}
interface EvmBlock {
  readonly transactions: readonly string[];
  readonly prefetchedTransactions?: readonly EvmTransaction[];
}
interface EvmLog {
  readonly transactionHash: string;
  readonly address: string;
  readonly topics: readonly string[];
  readonly data: string;
  readonly index: number;
  readonly blockNumber: number;
}
interface EvmLogFilter {
  readonly fromBlock: number;
  readonly toBlock: number;
  readonly address?: string;
  readonly topics?: (string | null)[];
}
interface EvmReceipt {
  readonly blockNumber: number;
  readonly status: number | null;
}
interface EvmProvider {
  getBlockNumber(): Promise<number>;
  getBlock(blockHashOrNumber: number, prefetchTxs?: boolean): Promise<EvmBlock | null>;
  getTransactionReceipt(txHash: string): Promise<EvmReceipt | null>;
  getLogs(filter: EvmLogFilter): Promise<EvmLog[]>;
}
interface EthersModule {
  JsonRpcProvider: new (url: string) => EvmProvider;
}

/** keccak256("Transfer(address,address,uint256)") — the ERC-20 Transfer topic. */
const ERC20_TRANSFER_TOPIC = '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef';

/** Left-pad a 20-byte hex address to a 32-byte topic (lowercased, 0x-prefixed). */
function addressToTopic(address: string): string {
  const clean = address.toLowerCase().replace(/^0x/, '');
  return `0x${clean.padStart(64, '0')}`;
}

function blockWindow(env: NodeJS.ProcessEnv): number {
  const raw = Number.parseInt(env.DEPOSIT_WATCH_EVM_BLOCK_WINDOW ?? '500', 10);
  return Number.isFinite(raw) && raw > 0 ? raw : 500;
}

class EvmChainClient implements ChainClient {
  readonly network: Network;
  private readonly provider: EvmProvider;
  private readonly windowSize: number;

  constructor(network: Network, provider: EvmProvider, windowSize: number) {
    this.network = network;
    this.provider = provider;
    this.windowSize = windowSize;
  }

  async getIncomingTransfers(
    address: string,
    coin: string,
    network: Network,
  ): Promise<ObservedTransfer[]> {
    const tip = await this.provider.getBlockNumber();
    const fromBlock = Math.max(0, tip - this.windowSize + 1);
    const target = address.toLowerCase();
    const transfers: ObservedTransfer[] = [];

    // Native-coin transfers: scan recent blocks for txs sent to the address.
    for (let n = fromBlock; n <= tip; n += 1) {
      const block = await this.provider.getBlock(n, true);
      const txs = block?.prefetchedTransactions ?? [];
      for (const tx of txs) {
        if (tx.to !== null && tx.to.toLowerCase() === target && tx.value > 0n) {
          transfers.push({
            txHash: tx.hash,
            outputIndex: 0,
            coin,
            network,
            amountSmallestUnit: tx.value,
            confirmations: tip - n + 1,
          });
        }
      }
    }

    // ERC-20 transfers: Transfer logs whose indexed `to` == the watched address.
    const logs = await this.provider.getLogs({
      fromBlock,
      toBlock: tip,
      topics: [ERC20_TRANSFER_TOPIC, null, addressToTopic(address)],
    });
    for (const log of logs) {
      transfers.push({
        txHash: log.transactionHash,
        outputIndex: log.index,
        coin,
        network,
        amountSmallestUnit: BigInt(log.data === '0x' ? '0' : log.data),
        tokenContractAddress: log.address,
        confirmations: tip - log.blockNumber + 1,
      });
    }

    return transfers;
  }

  async getConfirmations(txHash: string): Promise<number> {
    const receipt = await this.provider.getTransactionReceipt(txHash);
    if (receipt === null) return 0; // dropped / not yet mined / reorged out
    const tip = await this.provider.getBlockNumber();
    return Math.max(0, tip - receipt.blockNumber + 1);
  }
}

/**
 * Build an EVM client, lazily importing `ethers`. Returns `null` when the
 * library is unavailable so the watcher can skip the chain.
 */
class FailoverEvmProvider implements EvmProvider {
  private readonly providers: EvmProvider[];
  private currentIndex = 0;

  constructor(urls: string[], ethersMod: EthersModule) {
    this.providers = urls.map((url) => new ethersMod.JsonRpcProvider(url));
  }

  private async executeWithFailover<T>(fn: (provider: EvmProvider) => Promise<T>): Promise<T> {
    let lastError: unknown;
    for (let i = 0; i < this.providers.length; i += 1) {
      const idx = (this.currentIndex + i) % this.providers.length;
      const provider = this.providers[idx];
      try {
        const result = await fn(provider!);
        this.currentIndex = idx;
        return result;
      } catch (err) {
        lastError = err;
      }
    }
    throw lastError;
  }

  getBlockNumber(): Promise<number> {
    return this.executeWithFailover((p) => p.getBlockNumber());
  }

  getBlock(blockHashOrNumber: number, prefetchTxs?: boolean): Promise<EvmBlock | null> {
    return this.executeWithFailover((p) => p.getBlock(blockHashOrNumber, prefetchTxs));
  }

  getTransactionReceipt(txHash: string): Promise<EvmReceipt | null> {
    return this.executeWithFailover((p) => p.getTransactionReceipt(txHash));
  }

  getLogs(filter: EvmLogFilter): Promise<EvmLog[]> {
    return this.executeWithFailover((p) => p.getLogs(filter));
  }
}

/**
 * Build an EVM client, lazily importing `ethers`. Returns `null` when the
 * library is unavailable so the watcher can skip the chain.
 */
export async function loadEvmClient(
  network: Network,
  rpcUrl: string | string[],
  env: NodeJS.ProcessEnv,
): Promise<ChainClient | null> {
  try {
    // Variable specifier keeps the optional lib out of static module resolution.
    const specifier = 'ethers';
    const mod = (await import(specifier)) as unknown as EthersModule;
    const urls = Array.isArray(rpcUrl) ? rpcUrl : [rpcUrl];
    const provider = new FailoverEvmProvider(urls, mod);
    return new EvmChainClient(network, provider, blockWindow(env));
  } catch {
    return null;
  }
}
