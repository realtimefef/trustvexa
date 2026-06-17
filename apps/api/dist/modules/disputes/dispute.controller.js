import * as service from './dispute.service.js';
function requireUserId(req) {
    const userId = req.auth?.userId;
    if (!userId) {
        throw new Error('Authenticated user id missing after auth middleware.');
    }
    return userId;
}
export async function getByDeal(req, res) {
    const userId = requireUserId(req);
    const dealId = req.params.id;
    if (!dealId)
        throw new Error('Missing deal id route parameter.');
    const result = await service.getDisputeForUser(userId, dealId);
    res.status(200).json(result);
}
/**
 * Resolve a deal's open dispute (middleman-only, money-moving). The body is
 * validated by `resolveDisputeSchema`; idempotency is enforced by the route
 * chain and the Idempotency-Key header is threaded into the money-write.
 */
export async function resolve(req, res) {
    const userId = requireUserId(req);
    const dealId = req.params.id;
    if (!dealId)
        throw new Error('Missing deal id route parameter.');
    const idempotencyKey = req.header('Idempotency-Key') ?? '';
    const body = req.body;
    const result = await service.resolveDisputeForMiddleman({
        middlemanId: userId,
        dealId,
        idempotencyKey,
        outcome: body.outcome,
        reason: body.reason,
        ...(body.buyerShareSmallestUnit !== undefined
            ? { buyerShareSmallestUnit: body.buyerShareSmallestUnit }
            : {}),
    });
    res.status(200).json(result);
}
/**
 * Open a dispute on a Funded/Delivered deal as a party (buyer/seller). The body
 * carries the category and an optional opening statement; idempotency is
 * enforced by the route chain and the Idempotency-Key header is threaded into
 * the state-changing money-write. (Requirement 24.1)
 */
export async function open(req, res) {
    const userId = requireUserId(req);
    const dealId = req.params.id;
    if (!dealId)
        throw new Error('Missing deal id route parameter.');
    const idempotencyKey = req.header('Idempotency-Key') ?? '';
    const body = req.body;
    const result = await service.openDisputeForParty({
        userId,
        dealId,
        idempotencyKey,
        requestId: req.requestId,
        category: body.category,
        ...(body.statement !== undefined ? { statement: body.statement } : {}),
    });
    res.status(201).json(result);
}
/** List a dispute's thread messages for a party or the assigned middleman. */
export async function listMessages(req, res) {
    const userId = requireUserId(req);
    const disputeId = req.params.disputeId;
    if (!disputeId)
        throw new Error('Missing dispute id route parameter.');
    const result = await service.listDisputeMessagesForUser(userId, disputeId);
    res.status(200).json(result);
}
/** Post a statement to a dispute thread (party or assigned middleman). */
export async function postMessage(req, res) {
    const userId = requireUserId(req);
    const disputeId = req.params.disputeId;
    if (!disputeId)
        throw new Error('Missing dispute id route parameter.');
    const idempotencyKey = req.header('Idempotency-Key') ?? '';
    const body = req.body;
    const result = await service.postDisputeMessageForUser({
        userId,
        disputeId,
        idempotencyKey,
        body: body.body,
    });
    res.status(201).json(result);
}
/** Register an evidence record (hashed and locked at upload). */
export async function registerEvidence(req, res) {
    const userId = requireUserId(req);
    const disputeId = req.params.disputeId;
    if (!disputeId)
        throw new Error('Missing dispute id route parameter.');
    const idempotencyKey = req.header('Idempotency-Key') ?? '';
    const body = req.body;
    const result = await service.registerDisputeEvidenceForUser({
        userId,
        disputeId,
        idempotencyKey,
        fileKey: body.fileKey,
        fileHash: body.fileHash,
        mimeType: body.mimeType,
    });
    res.status(201).json(result);
}
//# sourceMappingURL=dispute.controller.js.map