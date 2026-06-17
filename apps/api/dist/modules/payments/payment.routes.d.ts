/**
 * Payments / escrow feature router. Intended to be mounted at `/api/v1/deals`
 * (the parent wires it into the root router), so the paths below resolve to:
 *
 *   GET  /api/v1/deals/:id/escrow-address     — per-deal deposit address
 *   POST /api/v1/deals/:id/payment/submit-tx  — buyer submits a payment tx hash
 *   GET  /api/v1/deals/:id/payment/status     — payment status timeline
 *   POST /api/v1/deals/:id/refund-wallet       — buyer sets/updates refund wallet
 *
 * Reads are visible to any party of the deal (buyer/seller/middleman); the two
 * money/state routes are buyer-only (enforced in the service) and require an
 * Idempotency-Key, running through the `runMoneyWrite` contract. Per-deal
 * access is enforced in the service, returning a 404 for non-parties.
 */
import { Router } from 'express';
export declare function paymentRouter(): Router;
//# sourceMappingURL=payment.routes.d.ts.map