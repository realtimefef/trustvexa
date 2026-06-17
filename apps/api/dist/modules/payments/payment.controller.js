import { requireParam, requireUserId } from '../../lib/http-params.js';
import * as service from './payment.service.js';
/** GET /deals/:id/escrow-address — per-deal deposit address (parties only). */
export async function getEscrowAddress(req, res) {
    const userId = requireUserId(req);
    const dealId = requireParam(req, 'id');
    const result = await service.getEscrowAddressForUser(userId, dealId);
    res.status(200).json(result);
}
/** POST /deals/:id/payment/submit-tx — buyer submits a payment-proof tx hash. */
export async function submitPaymentTx(req, res) {
    const buyerId = requireUserId(req);
    const dealId = requireParam(req, 'id');
    const idempotencyKey = req.header('Idempotency-Key') ?? '';
    const body = req.body;
    const result = await service.submitPaymentTx({
        buyerId,
        dealId,
        txHash: body.txHash,
        screenshotFileKey: body.screenshotFileKey,
        idempotencyKey,
    });
    res.status(200).json(result);
}
/** GET /deals/:id/payment/status — payment status timeline (parties only). */
export async function getPaymentStatus(req, res) {
    const userId = requireUserId(req);
    const dealId = requireParam(req, 'id');
    const result = await service.getPaymentStatusForUser(userId, dealId);
    res.status(200).json(result);
}
/** POST /deals/:id/refund-wallet — buyer sets/updates the refund wallet. */
export async function setRefundWallet(req, res) {
    const buyerId = requireUserId(req);
    const dealId = requireParam(req, 'id');
    const idempotencyKey = req.header('Idempotency-Key') ?? '';
    const body = req.body;
    const result = await service.setRefundWallet({
        buyerId,
        dealId,
        address: body.address,
        idempotencyKey,
    });
    res.status(200).json(result);
}
/** POST /deals/:id/payout-wallet — seller sets/updates the payout wallet. */
export async function setPayoutWallet(req, res) {
    const sellerId = requireUserId(req);
    const dealId = requireParam(req, 'id');
    const idempotencyKey = req.header('Idempotency-Key') ?? '';
    const body = req.body;
    const result = await service.setPayoutWallet({
        sellerId,
        dealId,
        address: body.address,
        idempotencyKey,
    });
    res.status(200).json(result);
}
/** POST /deals/:id/payment-checklist-confirm — buyer confirms the before-you-pay checklist. */
export async function confirmPaymentChecklist(req, res) {
    const buyerId = requireUserId(req);
    const dealId = requireParam(req, 'id');
    const idempotencyKey = req.header('Idempotency-Key') ?? '';
    const result = await service.confirmPaymentChecklist({
        buyerId,
        dealId,
        idempotencyKey,
    });
    res.status(200).json(result);
}
//# sourceMappingURL=payment.controller.js.map