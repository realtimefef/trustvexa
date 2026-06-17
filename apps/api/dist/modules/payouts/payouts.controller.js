import { requireParam, requireUserId } from '../../lib/http-params.js';
import { listQueueForMiddleman } from './payouts-read.repository.js';
import * as service from './payout.service.js';
function toIso(value) {
    if (value === null)
        return null;
    return value instanceof Date ? value.toISOString() : String(value);
}
/** GET /api/v1/payouts/queue — pending/approved payouts for this middleman. */
export async function getQueue(req, res) {
    const middlemanId = requireUserId(req);
    const rows = await listQueueForMiddleman(middlemanId);
    res.status(200).json({
        items: rows.map((r) => ({
            id: r.id,
            dealId: r.deal_id,
            payeeId: r.payee_id,
            coin: r.coin,
            network: r.network,
            address: r.address,
            amountCoin: r.amount_coin,
            amountSmallestUnit: r.amount_smallest_unit,
            preflightStatus: r.preflight_status,
            gasReserveStatus: r.gas_reserve_status,
            status: r.status,
            holdUntil: toIso(r.hold_until),
            txHash: r.tx_hash,
            versionNo: r.version_no,
            createdAt: toIso(r.created_at),
        })),
    });
}
/** POST /api/v1/payouts/:payoutId/approve — first control signature. */
export async function approve(req, res) {
    const middlemanId = requireUserId(req);
    const payoutId = requireParam(req, 'payoutId');
    const idempotencyKey = req.header('Idempotency-Key') ?? '';
    const result = await service.approvePayout({ middlemanId, payoutId, idempotencyKey });
    res.status(200).json(result);
}
/** POST /api/v1/payouts/:payoutId/broadcast — second control signature. */
export async function broadcast(req, res) {
    const middlemanId = requireUserId(req);
    const payoutId = requireParam(req, 'payoutId');
    const idempotencyKey = req.header('Idempotency-Key') ?? '';
    const result = await service.broadcastPayout({ middlemanId, payoutId, idempotencyKey });
    res.status(200).json(result);
}
//# sourceMappingURL=payouts.controller.js.map