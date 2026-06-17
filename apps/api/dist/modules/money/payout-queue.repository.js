export async function enqueuePayout(client, input) {
    const { rows } = await client.query(`INSERT INTO payout_queue
				(deal_id, payee_id, coin, network, address, amount_coin, amount_smallest_unit, status, hold_until)
			 VALUES ($1, $2, $3, $4, $5, $6, $7, 'pending', $8)
			 RETURNING id, deal_id, status, version_no`, [
        input.dealId,
        input.payeeId,
        input.coin,
        input.network,
        input.address,
        input.amountCoin,
        input.amountSmallestUnit.toString(),
        input.holdUntil,
    ]);
    const row = rows[0];
    if (!row)
        throw new Error('failed to enqueue payout');
    return row;
}
/**
 * Advance payout status with an optimistic version guard. Returns the new
 * version, or null if another writer moved first (caller should reload).
 */
export async function updatePayoutStatus(client, payoutId, expectedVersion, nextStatus, txHash) {
    const { rows } = await client.query(`UPDATE payout_queue
				 SET status = $3, tx_hash = COALESCE($4, tx_hash), version_no = version_no + 1
			 WHERE id = $1 AND version_no = $2
			 RETURNING version_no`, [payoutId, expectedVersion, nextStatus, txHash]);
    return rows[0]?.version_no ?? null;
}
export async function recordPreflightChecks(client, payoutQueueId, dealId, checkedBy, results) {
    for (const r of results) {
        await client.query(`INSERT INTO payout_preflight_checks
					(payout_queue_id, deal_id, check_type, result, message, checked_by)
				 VALUES ($1, $2, $3, $4, $5, $6)`, [payoutQueueId, dealId, r.check, r.passed ? 'pass' : 'fail', r.message, checkedBy]);
    }
}
export async function loadAllowlistStatus(client, coin, network, address) {
    const { rows } = await client.query(`SELECT active_from, is_active
			 FROM withdrawal_allowlist
			WHERE coin = $1 AND network = $2 AND address = $3
			LIMIT 1`, [coin, network, address]);
    const row = rows[0];
    if (!row)
        return null;
    return { activeFrom: row.active_from, isActive: row.is_active };
}
export async function loadOperatorCap(client, coin, network) {
    const { rows } = await client.query(`SELECT daily_cap, used_today
			 FROM operator_payout_limits
			WHERE coin = $1 AND network = $2
			LIMIT 1`, [coin, network]);
    const row = rows[0];
    if (!row)
        return null;
    const cap = BigInt(row.daily_cap);
    const used = BigInt(row.used_today);
    const remaining = cap - used;
    return {
        dailyCapSmallestUnit: cap,
        usedTodaySmallestUnit: used,
        remainingSmallestUnit: remaining < 0n ? 0n : remaining,
    };
}
//# sourceMappingURL=payout-queue.repository.js.map