/**
 * Write-side persistence for the wallets module. Idempotent writes run inside a
 * transaction (via `withTransaction`) so the "find existing or insert" check
 * and the insert cannot race. All lookups are scoped by `user_id`. Real columns
 * from the migrations are used verbatim. Not barrel-exported.
 */
import { query } from '@trustvexa/shared';
import { openPii } from '../crypto/key-provider.js';
/** Find the caller's saved wallet by its deterministic address hash. */
export async function findAddressByHash(tx, userId, addressHash) {
    const { rows } = await tx.query(`SELECT id, label, coin, network, address_enc, validation_status, created_at
       FROM address_book
      WHERE user_id = $1 AND address_hash = $2
      LIMIT 1`, [userId, addressHash]);
    return rows[0] ?? null;
}
export async function insertAddress(tx, input) {
    const { rows } = await tx.query(`INSERT INTO address_book (user_id, label, coin, network, address_enc, address_hash, validation_status)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING id, label, coin, network, address_enc, validation_status, created_at`, [
        input.userId,
        input.label,
        input.coin,
        input.network,
        input.addressEnc,
        input.addressHash,
        input.validationStatus,
    ]);
    const row = rows[0];
    if (!row)
        throw new Error('insertAddress returned no row');
    return row;
}
/** Delete one of the caller's saved wallets. Returns rows removed (0 or 1). */
export async function deleteAddress(userId, id) {
    const res = await query(`DELETE FROM address_book WHERE id = $1 AND user_id = $2`, [id, userId]);
    return res.rowCount ?? 0;
}
/** Record a validation check (audit trail) without touching the address book. */
export async function insertValidationCheck(input) {
    await query(`INSERT INTO wallet_validation_checks (user_id, deal_id, coin, network, address_hash, result, message)
     VALUES ($1, $2, $3, $4, $5, $6, $7)`, [
        input.userId,
        input.dealId,
        input.coin,
        input.network,
        input.addressHash,
        input.result,
        input.message,
    ]);
}
/**
 * Find an in-flight (pending) change request that matches the caller, wallet
 * type, and target address. Used to make creation idempotent: re-submitting the
 * same change while one is still pending returns the existing row rather than
 * stacking duplicates. `wallet_change_requests` has no address-hash column, so
 * the comparison is on the stored `new_address_enc` payload directly.
 */
export async function findPendingChangeRequest(tx, userId, walletType, newAddress) {
    const { rows } = await tx.query(`SELECT id, deal_id, wallet_type, old_address_enc, new_address_enc,
            status, hold_until, confirmed_at, created_at
       FROM wallet_change_requests
      WHERE user_id = $1 AND wallet_type = $2 AND status = 'pending'`, [userId, walletType]);
    const target = newAddress.trim().toLowerCase();
    for (const row of rows) {
        const decrypted = await openPii(row.new_address_enc);
        if (decrypted && decrypted.trim().toLowerCase() === target) {
            return row;
        }
    }
    return null;
}
export async function insertChangeRequest(tx, input) {
    const { rows } = await tx.query(`INSERT INTO wallet_change_requests
       (user_id, deal_id, wallet_type, old_address_enc, new_address_enc, status, hold_until)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING id, deal_id, wallet_type, old_address_enc, new_address_enc,
               status, hold_until, confirmed_at, created_at`, [
        input.userId,
        input.dealId,
        input.walletType,
        input.oldAddressEnc,
        input.newAddressEnc,
        input.status,
        input.holdUntil,
    ]);
    const row = rows[0];
    if (!row)
        throw new Error('insertChangeRequest returned no row');
    return row;
}
//# sourceMappingURL=wallets.repository.js.map