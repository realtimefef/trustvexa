import { type ValidationOutcome } from './address-validation.js';
import type { AddAddressInput, ChangeRequestInput, ValidateAddressInput, WithdrawInput } from './wallets.schemas.js';
export interface AddressBookEntry {
    id: string;
    label: string | null;
    coin: string | null;
    network: string | null;
    address: string;
    validationStatus: string | null;
    createdAt: string | null;
}
export declare function getAddressBook(userId: string): Promise<AddressBookEntry[]>;
export interface AddAddressResult {
    entry: AddressBookEntry;
    /** True when an existing identical wallet was returned (idempotent replay). */
    existed: boolean;
}
/**
 * Add a labelled wallet to the caller's address book. Idempotent: re-adding the
 * same address (same user) returns the existing row instead of inserting a
 * duplicate. The address format is validated against the coin/network before
 * anything is persisted.
 */
export declare function addAddress(userId: string, input: AddAddressInput): Promise<AddAddressResult>;
export declare function removeAddress(userId: string, id: string): Promise<void>;
/**
 * Validate an address against a coin/network without saving it to the address
 * book. The check itself is recorded in `wallet_validation_checks` as an audit
 * trail; only the address book is left untouched.
 */
export declare function validateAddress(userId: string, input: ValidateAddressInput): Promise<ValidationOutcome>;
export interface ChangeRequestEntry {
    id: string;
    dealId: string | null;
    walletType: string;
    oldAddress: string;
    newAddress: string;
    status: string | null;
    holdUntil: string | null;
    confirmedAt: string | null;
    createdAt: string | null;
}
export interface CreateChangeRequestResult {
    entry: ChangeRequestEntry;
    /** True when an in-flight identical request was returned (idempotent replay). */
    existed: boolean;
}
/**
 * Create a payout/refund wallet-change request, subject to a confirmation
 * time-delay (`hold_until`). Idempotent: while a matching request is still
 * pending, re-submitting returns the existing row. The new address is validated
 * against the coin/network first.
 */
export declare function createChangeRequest(userId: string, input: ChangeRequestInput): Promise<CreateChangeRequestResult>;
export declare function getChangeRequests(userId: string): Promise<ChangeRequestEntry[]>;
export interface WalletInfo {
    balances: Array<{
        coin: string;
        network: string;
        amount: string;
        usd: string;
        status: 'Available' | 'Pending' | 'Unavailable';
        balanceUnavailable?: boolean;
    }>;
    addresses: Array<{
        network: string;
        address: string;
    }>;
    addressBook: AddressBookEntry[];
}
export declare function getWalletInfo(userId: string): Promise<WalletInfo>;
export interface WithdrawResult {
    success: boolean;
    message: string;
    txHash?: string;
}
/**
 * SEC-CRIT-1 FIX: Self-service wallet withdrawal, now wrapped in runMoneyWrite.
 *
 * Previously the preflight check and payout_queue INSERT were two separate,
 * non-transactional operations. Two concurrent requests with the same
 * Idempotency-Key could both pass the preflight before either INSERT committed,
 * creating two on-chain payouts (double-spend).
 *
 * runMoneyWrite atomically claims the idempotency key via an
 * ON CONFLICT DO NOTHING INSERT before executing the work. The second
 * concurrent caller blocks on the unique index, then replays the first
 * result — guaranteeing exactly-once execution.
 *
 * The 10-second polling loop is also removed: the endpoint returns immediately
 * with the queued status, keeping the DB connection pool free.
 */
export declare function withdraw(userId: string, input: WithdrawInput, idempotencyKey: string): Promise<WithdrawResult>;
//# sourceMappingURL=wallets.service.d.ts.map