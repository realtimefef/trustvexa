/**
 * Deposit persistence (tasks 5.18, 5.20, DB-bound).
 *
 * Records detected transfers in `payments` and reorg events in
 * `chain_reorg_events`. Crediting is idempotent via the (tx_hash, output_index)
 * unique constraint: a re-seen deposit updates confirmations/status but never
 * inserts a second row. Classification lives in `deposit-classification.ts` and
 * `confirmations.ts`; this module only persists. `bigint` smallest-unit amounts
 * are bound as strings to preserve precision.
 */
import type { MatchStatus } from './deposit-classification.js';
export interface DepositTxClient {
    query: <R = unknown>(text: string, params?: readonly unknown[]) => Promise<{
        rows: R[];
        rowCount: number | null;
    }>;
}
export interface UpsertPaymentInput {
    dealId: string;
    coin: string;
    network: string;
    tokenContractId: string | null;
    txHash: string;
    outputIndex: number;
    amountCoin: string;
    amountSmallestUnit: bigint;
    confirmations: number;
    direction: 'in' | 'out';
    matchStatus: MatchStatus;
    status: string;
    explorerUrl: string;
}
export interface PaymentRow {
    id: string;
    deal_id: string;
    tx_hash: string;
    output_index: number;
    confirmations: number;
    match_status: MatchStatus;
    status: string;
}
/**
 * Idempotent deposit upsert keyed on (tx_hash, output_index). On conflict the
 * confirmations/match_status/status are refreshed (e.g. as confirmations grow)
 * without creating a duplicate credit row.
 */
export declare function upsertPayment(client: DepositTxClient, input: UpsertPaymentInput): Promise<PaymentRow>;
export interface RecordReorgInput {
    paymentId: string;
    dealId: string;
    txHash: string;
    previousStatus: string;
    newStatus: string;
}
export declare function recordReorgEvent(client: DepositTxClient, input: RecordReorgInput): Promise<void>;
/**
 * Active token-contract allowlist rows for a coin/network, shaped for the
 * deposit classifier (`AllowlistEntry`). Token deposits are credited only from
 * an active allowlisted contract; this read backs that check in the watcher.
 */
export interface AllowlistContractRow {
    coin: string;
    network: string;
    contract_address: string;
    is_active: boolean;
}
export declare function loadActiveAllowlist(client: DepositTxClient, coin: string, network: string): Promise<AllowlistContractRow[]>;
/**
 * Previously-detected incoming deposits for a deal, used by the watcher to
 * re-check confirmations and detect reorgs (a credited tx that drops below
 * threshold or disappears). Returns only inbound rows.
 */
export interface CreditedDepositRow {
    id: string;
    deal_id: string;
    tx_hash: string;
    output_index: number;
    confirmations: number;
    match_status: MatchStatus | null;
    status: string | null;
}
export declare function listInboundDeposits(client: DepositTxClient, dealId: string): Promise<CreditedDepositRow[]>;
/** Update only the confirmations + status of an existing payment row (reorg path). */
export declare function updateDepositStatus(client: DepositTxClient, paymentId: string, confirmations: number, status: string): Promise<void>;
//# sourceMappingURL=deposit.repository.d.ts.map