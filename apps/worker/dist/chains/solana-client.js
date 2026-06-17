const SIGNATURE_LIMIT = 25;
function accountKeysOf(tx) {
    return tx.transaction.message.staticAccountKeys ?? tx.transaction.message.accountKeys ?? [];
}
class SolanaChainClient {
    network = 'SOLANA';
    conn;
    mod;
    constructor(conn, mod) {
        this.conn = conn;
        this.mod = mod;
    }
    async getIncomingTransfers(address, coin) {
        const pubkey = new this.mod.PublicKey(address);
        const signatures = await this.conn.getSignaturesForAddress(pubkey, {
            limit: SIGNATURE_LIMIT,
        });
        const transfers = [];
        for (const sig of signatures) {
            const finalized = sig.confirmationStatus === 'finalized';
            const tx = await this.conn.getTransaction(sig.signature, {
                maxSupportedTransactionVersion: 0,
            });
            if (tx?.meta === null || tx?.meta === undefined)
                continue;
            const keys = accountKeysOf(tx);
            const idx = keys.findIndex((k) => k.toBase58() === address);
            if (idx < 0)
                continue;
            const pre = tx.meta.preBalances[idx] ?? 0;
            const post = tx.meta.postBalances[idx] ?? 0;
            const delta = BigInt(post) - BigInt(pre);
            if (delta <= 0n)
                continue; // not an inbound credit
            transfers.push({
                txHash: sig.signature,
                outputIndex: 0,
                coin,
                network: 'SOLANA',
                amountSmallestUnit: delta,
                confirmations: finalized ? 1 : 0,
                finalized,
            });
        }
        return transfers;
    }
    async getConfirmations(txHash) {
        const statuses = await this.conn.getSignatureStatuses([txHash]);
        const status = statuses.value[0];
        if (status === null || status === undefined)
            return 0; // dropped / unknown
        return status.confirmationStatus === 'finalized' ? 'finalized' : 0;
    }
}
class FailoverSolConnection {
    connections;
    currentIndex = 0;
    constructor(urls, web3Mod) {
        this.connections = urls.map((url) => new web3Mod.Connection(url, 'finalized'));
    }
    async executeWithFailover(fn) {
        let lastError;
        for (let i = 0; i < this.connections.length; i += 1) {
            const idx = (this.currentIndex + i) % this.connections.length;
            const conn = this.connections[idx];
            try {
                const result = await fn(conn);
                this.currentIndex = idx;
                return result;
            }
            catch (err) {
                lastError = err;
            }
        }
        throw lastError;
    }
    getSignaturesForAddress(address, options) {
        return this.executeWithFailover((c) => c.getSignaturesForAddress(address, options));
    }
    getTransaction(signature, options) {
        return this.executeWithFailover((c) => c.getTransaction(signature, options));
    }
    getSignatureStatuses(signatures) {
        return this.executeWithFailover((c) => c.getSignatureStatuses(signatures));
    }
}
/**
 * Build a Solana client, lazily importing `@solana/web3.js`. Returns `null`
 * when the library is unavailable so the watcher can skip the chain.
 */
export async function loadSolanaClient(rpcUrl) {
    try {
        const specifier = '@solana/web3.js';
        const mod = (await import(specifier));
        const urls = Array.isArray(rpcUrl) ? rpcUrl : [rpcUrl];
        const conn = new FailoverSolConnection(urls, mod);
        return new SolanaChainClient(conn, mod);
    }
    catch {
        return null;
    }
}
//# sourceMappingURL=solana-client.js.map