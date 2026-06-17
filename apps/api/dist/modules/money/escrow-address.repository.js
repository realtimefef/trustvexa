export async function getEscrowAddress(client, dealId) {
    const { rows } = await client.query(`SELECT id, deal_id, coin, network, address, derivation_index
			 FROM escrow_addresses
			WHERE deal_id = $1
			LIMIT 1`, [dealId]);
    return rows[0] ?? null;
}
/** Deal statuses in which an escrow address is actively awaiting funding. */
export const DEPOSIT_WATCH_STATUSES = ['Confirmed', 'Amended'];
export async function listEscrowAddressesAwaitingFunding(client, limit = 500) {
    const { rows } = await client.query(`SELECT ea.id AS escrow_address_id,
				 ea.deal_id AS deal_id,
				 ea.coin AS coin,
				 ea.network AS network,
				 ea.address AS address,
				 d.amount_smallest_unit AS amount_smallest_unit,
				 d.price_tolerance_pct AS price_tolerance_pct,
				 d.risk_score AS risk_score
			 FROM escrow_addresses ea
			 JOIN deals d ON d.id = ea.deal_id
			WHERE d.status = ANY($1::text[])
			ORDER BY ea.created_at ASC
			LIMIT $2`, [DEPOSIT_WATCH_STATUSES, limit]);
    return rows;
}
/** Insert the deal's escrow address, returning the existing row if one exists. */
export async function insertEscrowAddress(client, input) {
    const existing = await getEscrowAddress(client, input.dealId);
    if (existing)
        return existing;
    const { rows } = await client.query(`INSERT INTO escrow_addresses (deal_id, coin, network, address, derivation_index)
			 VALUES ($1, $2, $3, $4, $5)
			 RETURNING id, deal_id, coin, network, address, derivation_index`, [input.dealId, input.coin, input.network, input.address, input.derivationIndex]);
    const row = rows[0];
    if (!row)
        throw new Error('failed to insert escrow address');
    return row;
}
//# sourceMappingURL=escrow-address.repository.js.map