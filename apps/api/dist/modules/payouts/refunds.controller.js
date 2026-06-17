import { requireParam, requireUserId } from '../../lib/http-params.js';
import * as service from './refund.service.js';
/** POST /api/v1/refunds/by-deal/:id/process — process a deal refund. */
export async function process(req, res) {
    const middlemanId = requireUserId(req);
    const dealId = requireParam(req, 'id');
    const idempotencyKey = req.header('Idempotency-Key') ?? '';
    const body = req.body;
    const result = await service.processRefundForDeal({
        middlemanId,
        dealId,
        idempotencyKey,
        cause: body.cause,
        reason: body.reason,
        ...(body.gasCostSmallestUnit !== undefined
            ? { gasCostSmallestUnit: body.gasCostSmallestUnit }
            : {}),
    });
    res.status(200).json(result);
}
//# sourceMappingURL=refunds.controller.js.map