/**
 * Read-side data access for the wallets module. Every read is scoped by
 * `user_id` so a caller only ever sees their own saved wallets and
 * wallet-change requests. Uses the real columns from the migrations for
 * `address_book` and `wallet_change_requests`.
 */
import { query } from '@trustvexa/shared';
export async function listAddressBook(userId) {
    const res = await query(`SELECT id, label, coin, network, address_enc, validation_status, created_at
       FROM address_book
      WHERE user_id = $1
      ORDER BY created_at DESC
      LIMIT 200`, [userId]);
    return res.rows;
}
export async function listChangeRequests(userId) {
    const res = await query(`SELECT id, deal_id, wallet_type, old_address_enc, new_address_enc,
            status, hold_until, confirmed_at, created_at
       FROM wallet_change_requests
      WHERE user_id = $1
      ORDER BY created_at DESC
      LIMIT 200`, [userId]);
    return res.rows;
}
//# sourceMappingURL=wallets-read.repository.js.map