function resolveCtor(mod) {
    return mod.default ?? mod.TronWeb ?? null;
}
class TronChainClient {
    network = 'TRON';
    tron;
    urls;
    constructor(tron, urls) {
        this.tron = tron;
        this.urls = urls;
    }
    // Enumeration requires the TronGrid HTTP indexer (gated separately).
    async getIncomingTransfers(address, coin) {
        const baseUrl = getTronGridBaseUrl(this.urls);
        const url = `${baseUrl}/v1/accounts/${address}/transactions/trc20`;
        const headers = {
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
            const body = (await response.json());
            if (!body || !body.success || !Array.isArray(body.data)) {
                return [];
            }
            // Fetch current block number to compute confirmations
            let currentBlock = 0;
            try {
                const current = await this.tron.trx.getCurrentBlock();
                currentBlock = current.block_header?.raw_data?.number ?? 0;
            }
            catch {
                // Fallback
            }
            const transfers = [];
            for (const txRaw of body.data) {
                // Cast to a typed interface — TronGrid response items are plain objects.
                const tx = txRaw;
                if (!tx.to || tx.to !== address)
                    continue;
                if (!tx.value)
                    continue;
                let amount;
                try {
                    amount = BigInt(tx.value);
                }
                catch {
                    continue;
                }
                const blockNumber = tx.block_number != null ? Number(tx.block_number) : null;
                let confirmationsCount = 0;
                if (blockNumber !== null && currentBlock > 0) {
                    confirmationsCount = Math.max(0, currentBlock - blockNumber + 1);
                }
                const entry = {
                    txHash: tx.transaction_id ?? '',
                    outputIndex: 0,
                    coin,
                    network: 'TRON',
                    amountSmallestUnit: amount,
                    confirmations: confirmationsCount,
                };
                if (tx.token_info?.address !== undefined) {
                    entry.tokenContractAddress = tx.token_info.address;
                }
                transfers.push(entry);
            }
            return transfers;
        }
        catch (err) {
            console.error('Failed to get incoming TRC-20 transfers from TronGrid:', err);
            return [];
        }
    }
    async getConfirmations(txHash) {
        const info = await this.tron.trx.getTransactionInfo(txHash);
        const txBlock = info?.blockNumber;
        if (txBlock === undefined || txBlock <= 0)
            return 0; // unconfirmed / unknown
        const current = await this.tron.trx.getCurrentBlock();
        const tip = current.block_header?.raw_data?.number ?? 0;
        return Math.max(0, tip - txBlock + 1);
    }
}
function getTronGridBaseUrl(rpcUrls) {
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
class FailoverTronTrx {
    instances;
    currentIndex = 0;
    constructor(urls, Ctor) {
        this.instances = urls.map((url) => new Ctor({ fullHost: url }));
    }
    async executeWithFailover(fn) {
        let lastError;
        for (let i = 0; i < this.instances.length; i += 1) {
            const idx = (this.currentIndex + i) % this.instances.length;
            const instance = this.instances[idx];
            try {
                const result = await fn(instance.trx);
                this.currentIndex = idx;
                return result;
            }
            catch (err) {
                lastError = err;
            }
        }
        throw lastError;
    }
    getCurrentBlock() {
        return this.executeWithFailover((t) => t.getCurrentBlock());
    }
    getTransactionInfo(txId) {
        return this.executeWithFailover((t) => t.getTransactionInfo(txId));
    }
}
/**
 * Build a Tron client, lazily importing `tronweb`. Returns `null` when the
 * library is unavailable so the watcher can skip the chain.
 */
export async function loadTronClient(rpcUrl) {
    try {
        const specifier = 'tronweb';
        const mod = (await import(specifier));
        const Ctor = resolveCtor(mod);
        if (Ctor === null)
            return null;
        const urls = Array.isArray(rpcUrl) ? rpcUrl : [rpcUrl];
        const trx = new FailoverTronTrx(urls, Ctor);
        return new TronChainClient({ trx }, urls);
    }
    catch {
        return null;
    }
}
//# sourceMappingURL=tron-client.js.map