/**
 * Payments / escrow HTTP controller.
 *
 * The caller id comes from the verified JWT (never the body); access against
 * the deal parties is enforced in the service. Money/state routes thread the
 * `Idempotency-Key` header into the service's `runMoneyWrite` contract.
 */
import type { Request, Response } from 'express';
/** GET /deals/:id/escrow-address — per-deal deposit address (parties only). */
export declare function getEscrowAddress(req: Request, res: Response): Promise<void>;
/** POST /deals/:id/payment/submit-tx — buyer submits a payment-proof tx hash. */
export declare function submitPaymentTx(req: Request, res: Response): Promise<void>;
/** GET /deals/:id/payment/status — payment status timeline (parties only). */
export declare function getPaymentStatus(req: Request, res: Response): Promise<void>;
/** POST /deals/:id/refund-wallet — buyer sets/updates the refund wallet. */
export declare function setRefundWallet(req: Request, res: Response): Promise<void>;
/** POST /deals/:id/payout-wallet — seller sets/updates the payout wallet. */
export declare function setPayoutWallet(req: Request, res: Response): Promise<void>;
/** POST /deals/:id/payment-checklist-confirm — buyer confirms the before-you-pay checklist. */
export declare function confirmPaymentChecklist(req: Request, res: Response): Promise<void>;
//# sourceMappingURL=payment.controller.d.ts.map