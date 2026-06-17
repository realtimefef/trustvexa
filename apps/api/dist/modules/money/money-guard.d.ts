/**
 * Server-authoritative money guard. *(Requirements 17.3, 17.4, 17.5)*
 *
 * Every ledger-affecting figure is computed from server-held values only.
 * Client-supplied amounts are display-only: they are never read for any ledger
 * operation, and UI rounding of a displayed value can never alter a stored
 * amount. This module is the single choke point that enforces that rule.
 */
import type { FeeBreakdown, FeePayer } from './fee-engine.js';
/** Inputs that originate from server-held records only. */
export interface ServerMoneyInputs {
    readonly dealAmountCents: bigint;
    readonly feePayer: FeePayer;
    readonly gasFeeCents: bigint;
    /** Buyer's agreed share of the platform fee for `split` deals, in bps. */
    readonly splitBuyerBps?: bigint;
}
/**
 * Compute the ledger-affecting breakdown. The optional second argument models
 * whatever a client might send; it is intentionally ignored so the result
 * depends solely on server-held values. *(Requirements 17.3, 17.4)*
 */
export declare function computeServerAuthoritativeBreakdown(server: ServerMoneyInputs, _clientSupplied?: unknown): FeeBreakdown;
export interface ClientDisplayReconciliation {
    readonly matches: boolean;
    readonly mismatchedFields: readonly string[];
}
/**
 * Compare a client's displayed figures against the authoritative breakdown for
 * telemetry/UX only. This NEVER mutates or returns the client's numbers; the
 * authoritative breakdown is always the source of truth for the ledger.
 * *(Requirement 17.5)*
 */
export declare function reconcileClientDisplay(authoritative: FeeBreakdown, clientDisplay: Partial<Record<keyof FeeBreakdown, bigint>>): ClientDisplayReconciliation;
//# sourceMappingURL=money-guard.d.ts.map