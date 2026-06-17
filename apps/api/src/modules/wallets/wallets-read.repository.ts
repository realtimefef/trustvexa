/**
 * Read-side data access for the wallets module. Every read is scoped by
 * `user_id` so a caller only ever sees their own saved wallets and
 * wallet-change requests. Uses the real columns from the migrations for
 * `address_book` and `wallet_change_requests`.
 */
import { query } from '@trustvexa/shared';

export interface AddressBookRow {
  id: string;
  label: string | null;
  coin: string | null;
  network: string | null;
  address_enc: string | null;
  validation_status: string | null;
  created_at: Date | string;
}

export async function listAddressBook(userId: string): Promise<AddressBookRow[]> {
  const res = await query<AddressBookRow>(
    `SELECT id, label, coin, network, address_enc, validation_status, created_at
       FROM address_book
      WHERE user_id = $1
      ORDER BY created_at DESC
      LIMIT 200`,
    [userId],
  );
  return res.rows;
}

export interface ChangeRequestRow {
  id: string;
  deal_id: string | null;
  wallet_type: string;
  old_address_enc: string | null;
  new_address_enc: string | null;
  status: string | null;
  hold_until: Date | string | null;
  confirmed_at: Date | string | null;
  created_at: Date | string;
}

export async function listChangeRequests(userId: string): Promise<ChangeRequestRow[]> {
  const res = await query<ChangeRequestRow>(
    `SELECT id, deal_id, wallet_type, old_address_enc, new_address_enc,
            status, hold_until, confirmed_at, created_at
       FROM wallet_change_requests
      WHERE user_id = $1
      ORDER BY created_at DESC
      LIMIT 200`,
    [userId],
  );
  return res.rows;
}
