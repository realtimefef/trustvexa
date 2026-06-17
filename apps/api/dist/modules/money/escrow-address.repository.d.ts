/**
 * Escrow address persistence (task 5.17, DB-bound).
 *
 * One deposit address per deal in `escrow_addresses`. The derivation_index is
 * assigned by the caller from the HD wallet manager; this module only stores
 * and retrieves the public address. Raw key material is never written here.
 */
export interface EscrowAddressTxClient {
    query: <R = unknown>(text: string, params?: readonly unknown[]) => Promise<{
        rows: R[];
        rowCount: number | null;
    }>;
}
export interface EscrowAddressRow {
    id: string;
    deal_id: string;
    coin: string;
    network: string;
    address: string;
    derivation_index: number | null;
}
export declare function getEscrowAddress(client: EscrowAddressTxClient, dealId: string): Promise<EscrowAddressRow | null>;
export interface InsertEscrowAddressInput {
    dealId: string;
    coin: string;
    network: string;
    address: string;
    derivationIndex: number | null;
}
/**
 * Escrow addresses for deals that are awaiting on-chain funding.
 *
 * A deal becomes fundable once its terms are accepted (`Confirmed`): the
 * `FundsHeld` event then transitions it to `Funded`. The deposit-watcher
 * (`@trustvexa/worker`) sweeps these rows, queries each address on its chain,
 * and credits matching deposits idempotently. The expected coin/network/amount
 * and the risk score travel from the immutable funding snapshot on `deals` so
 * the watcher can classify deposits and pick the right confirmation threshold.
 * Read-only; no key material is exposed.
 */
export interface PendingDepositAddressRow {
    escrow_address_id: string;
    deal_id: string;
    coin: string;
    network: string;
    address: string;
    /** Expected deposit amount in integer smallest units (string from PG bigint). */
    amount_smallest_unit: string | null;
    /** Allowed over/under-payment band as a percentage (PG numeric -> string). */
    price_tolerance_pct: string | null;
    /** Deal risk score used to derive the confirmation risk tier (nullable). */
    risk_score: number | null;
}
/** Deal statuses in which an escrow address is actively awaiting funding. */
export declare const DEPOSIT_WATCH_STATUSES: readonly string[];
export declare function listEscrowAddressesAwaitingFunding(client: EscrowAddressTxClient, limit?: number): Promise<PendingDepositAddressRow[]>;
/** Insert the deal's escrow address, returning the existing row if one exists. */
export declare function insertEscrowAddress(client: EscrowAddressTxClient, input: InsertEscrowAddressInput): Promise<EscrowAddressRow>;
//# sourceMappingURL=escrow-address.repository.d.ts.map