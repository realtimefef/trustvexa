export async function recordSweep(client, input) {
    await client.query(`INSERT INTO hot_wallet_sweeps
				(coin, network, amount_smallest_unit, threshold, from_hot_address, to_cold_address, tx_hash, swept_at)
			 VALUES ($1, $2, $3, $4, $5, $6, $7, now())`, [
        input.coin,
        input.network,
        input.amountSmallestUnit.toString(),
        input.thresholdSmallestUnit.toString(),
        input.fromHotAddress,
        input.toColdAddress,
        input.txHash,
    ]);
}
export async function recordGasTopUp(client, input) {
    await client.query(`INSERT INTO gas_top_up_events
				(coin, network, from_address, to_hot_wallet_address, amount_smallest_unit, tx_hash, status)
			 VALUES ($1, $2, $3, $4, $5, $6, $7)`, [
        input.coin,
        input.network,
        input.fromAddress,
        input.toHotWalletAddress,
        input.amountSmallestUnit.toString(),
        input.txHash,
        input.status,
    ]);
}
export async function recordTransactionRetry(client, input) {
    await client.query(`INSERT INTO transaction_retries
				(payment_id, payout_queue_id, deal_id, reason, action, old_tx_hash, new_tx_hash, status)
			 VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`, [
        input.paymentId,
        input.payoutQueueId,
        input.dealId,
        input.reason,
        input.action,
        input.oldTxHash,
        input.newTxHash,
        input.status,
    ]);
}
export async function recordPoisoningAlert(client, input) {
    await client.query(`INSERT INTO address_poisoning_alerts
				(user_id, deal_id, suspected_address, real_address, source_tx_hash)
			 VALUES ($1, $2, $3, $4, $5)`, [input.userId, input.dealId, input.suspectedAddress, input.realAddress, input.sourceTxHash]);
}
export async function recordAddressScreening(client, input) {
    await client.query(`INSERT INTO address_screenings (address, coin, network, result, source, checked_at)
			 VALUES ($1, $2, $3, $4, $5, now())`, [input.address, input.coin, input.network, input.result, input.source]);
}
//# sourceMappingURL=custody.repository.js.map