/**
 * Idempotent deposit upsert keyed on (tx_hash, output_index). On conflict the
 * confirmations/match_status/status are refreshed (e.g. as confirmations grow)
 * without creating a duplicate credit row.
 */
export async function upsertPayment(client, input) {
    const { rows } = await client.query(`INSERT INTO payments
				(deal_id, coin, network, token_contract_id, tx_hash, output_index,
				 amount_coin, amount_smallest_unit, confirmations, direction, match_status, status, explorer_url)
			 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
			 ON CONFLICT (tx_hash, output_index) DO UPDATE
				 SET confirmations = EXCLUDED.confirmations,
						 match_status = EXCLUDED.match_status,
						 status = EXCLUDED.status
			 RETURNING id, deal_id, tx_hash, output_index, confirmations, match_status, status`, [
        input.dealId,
        input.coin,
        input.network,
        input.tokenContractId,
        input.txHash,
        input.outputIndex,
        input.amountCoin,
        input.amountSmallestUnit.toString(),
        input.confirmations,
        input.direction,
        input.matchStatus,
        input.status,
        input.explorerUrl,
    ]);
    const row = rows[0];
    if (!row)
        throw new Error('failed to upsert payment');
    return row;
}
export async function recordReorgEvent(client, input) {
    await client.query(`INSERT INTO chain_reorg_events
				(payment_id, deal_id, tx_hash, previous_status, new_status, detected_at)
			 VALUES ($1, $2, $3, $4, $5, now())`, [input.paymentId, input.dealId, input.txHash, input.previousStatus, input.newStatus]);
}
export async function loadActiveAllowlist(client, coin, network) {
    const { rows } = await client.query(`SELECT coin, network, contract_address, is_active
			 FROM token_contract_allowlist
			WHERE coin = $1 AND network = $2 AND is_active = true`, [coin, network]);
    return rows;
}
export async function listInboundDeposits(client, dealId) {
    const { rows } = await client.query(`SELECT id, deal_id, tx_hash, output_index, confirmations, match_status, status
			 FROM payments
			WHERE deal_id = $1 AND direction = 'in' AND tx_hash IS NOT NULL`, [dealId]);
    return rows;
}
/** Update only the confirmations + status of an existing payment row (reorg path). */
export async function updateDepositStatus(client, paymentId, confirmations, status) {
    await client.query(`UPDATE payments SET confirmations = $2, status = $3 WHERE id = $1`, [
        paymentId,
        confirmations,
        status,
    ]);
}
//# sourceMappingURL=deposit.repository.js.map