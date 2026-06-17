/** keccak256("Transfer(address,address,uint256)") — the ERC-20 Transfer topic. */
const ERC20_TRANSFER_TOPIC = '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef';
/** Left-pad a 20-byte hex address to a 32-byte topic (lowercased, 0x-prefixed). */
function addressToTopic(address) {
    const clean = address.toLowerCase().replace(/^0x/, '');
    return `0x${clean.padStart(64, '0')}`;
}
function blockWindow(env) {
    const raw = Number.parseInt(env.DEPOSIT_WATCH_EVM_BLOCK_WINDOW ?? '500', 10);
    return Number.isFinite(raw) && raw > 0 ? raw : 500;
}
class EvmChainClient {
    network;
    provider;
    windowSize;
    constructor(network, provider, windowSize) {
        this.network = network;
        this.provider = provider;
        this.windowSize = windowSize;
    }
    async getIncomingTransfers(address, coin, network) {
        const tip = await this.provider.getBlockNumber();
        const fromBlock = Math.max(0, tip - this.windowSize + 1);
        const target = address.toLowerCase();
        const transfers = [];
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
    async getConfirmations(txHash) {
        const receipt = await this.provider.getTransactionReceipt(txHash);
        if (receipt === null)
            return 0; // dropped / not yet mined / reorged out
        const tip = await this.provider.getBlockNumber();
        return Math.max(0, tip - receipt.blockNumber + 1);
    }
}
/**
 * Build an EVM client, lazily importing `ethers`. Returns `null` when the
 * library is unavailable so the watcher can skip the chain.
 */
class FailoverEvmProvider {
    providers;
    currentIndex = 0;
    constructor(urls, ethersMod) {
        this.providers = urls.map((url) => new ethersMod.JsonRpcProvider(url));
    }
    async executeWithFailover(fn) {
        let lastError;
        for (let i = 0; i < this.providers.length; i += 1) {
            const idx = (this.currentIndex + i) % this.providers.length;
            const provider = this.providers[idx];
            try {
                const result = await fn(provider);
                this.currentIndex = idx;
                return result;
            }
            catch (err) {
                lastError = err;
            }
        }
        throw lastError;
    }
    getBlockNumber() {
        return this.executeWithFailover((p) => p.getBlockNumber());
    }
    getBlock(blockHashOrNumber, prefetchTxs) {
        return this.executeWithFailover((p) => p.getBlock(blockHashOrNumber, prefetchTxs));
    }
    getTransactionReceipt(txHash) {
        return this.executeWithFailover((p) => p.getTransactionReceipt(txHash));
    }
    getLogs(filter) {
        return this.executeWithFailover((p) => p.getLogs(filter));
    }
}
/**
 * Build an EVM client, lazily importing `ethers`. Returns `null` when the
 * library is unavailable so the watcher can skip the chain.
 */
export async function loadEvmClient(network, rpcUrl, env) {
    try {
        // Variable specifier keeps the optional lib out of static module resolution.
        const specifier = 'ethers';
        const mod = (await import(specifier));
        const urls = Array.isArray(rpcUrl) ? rpcUrl : [rpcUrl];
        const provider = new FailoverEvmProvider(urls, mod);
        return new EvmChainClient(network, provider, blockWindow(env));
    }
    catch {
        return null;
    }
}
//# sourceMappingURL=evm-client.js.map