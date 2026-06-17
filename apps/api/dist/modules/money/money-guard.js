/**
 * Server-authoritative money guard. *(Requirements 17.3, 17.4, 17.5)*
 *
 * Every ledger-affecting figure is computed from server-held values only.
 * Client-supplied amounts are display-only: they are never read for any ledger
 * operation, and UI rounding of a displayed value can never alter a stored
 * amount. This module is the single choke point that enforces that rule.
 */
import { computeFeeBreakdown } from './fee-engine.js';
/**
 * Compute the ledger-affecting breakdown. The optional second argument models
 * whatever a client might send; it is intentionally ignored so the result
 * depends solely on server-held values. *(Requirements 17.3, 17.4)*
 */
export function computeServerAuthoritativeBreakdown(server, _clientSupplied) {
    // `_clientSupplied` is display-only and deliberately never consulted.
    void _clientSupplied;
    return computeFeeBreakdown({
        dealAmountCents: server.dealAmountCents,
        feePayer: server.feePayer,
        gasFeeCents: server.gasFeeCents,
        ...(server.splitBuyerBps !== undefined ? { splitBuyerBps: server.splitBuyerBps } : {}),
    });
}
/**
 * Compare a client's displayed figures against the authoritative breakdown for
 * telemetry/UX only. This NEVER mutates or returns the client's numbers; the
 * authoritative breakdown is always the source of truth for the ledger.
 * *(Requirement 17.5)*
 */
export function reconcileClientDisplay(authoritative, clientDisplay) {
    const comparable = [
        'dealAmountCents',
        'platformFeeCents',
        'settlementFeeCents',
        'gasFeeCents',
        'buyerSendsCents',
        'sellerReceivesCents',
        'platformKeepsCents',
    ];
    const mismatchedFields = [];
    for (const field of comparable) {
        const supplied = clientDisplay[field];
        if (supplied !== undefined && supplied !== authoritative[field]) {
            mismatchedFields.push(field);
        }
    }
    return { matches: mismatchedFields.length === 0, mismatchedFields };
}
//# sourceMappingURL=money-guard.js.map