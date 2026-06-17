import * as amendments from './amendment.service.js';
function requireUserId(req) {
    const userId = req.auth?.userId;
    if (!userId) {
        throw new Error('Authenticated user id missing after auth middleware.');
    }
    return userId;
}
export async function requestAmendment(req, res) {
    const userId = requireUserId(req);
    const result = await amendments.requestAmendment({
        dealId: req.params.id,
        userId,
        input: req.body,
    });
    res.status(201).json(result);
}
export async function listAmendments(req, res) {
    const userId = requireUserId(req);
    const result = await amendments.listAmendments({ dealId: req.params.id, userId });
    res.status(200).json(result);
}
export async function decideAmendment(req, res) {
    const userId = requireUserId(req);
    const result = await amendments.decideAmendment({
        dealId: req.params.id,
        amendmentId: req.params.amendmentId,
        userId,
        input: req.body,
    });
    res.status(200).json(result);
}
export async function requestCancellation(req, res) {
    const userId = requireUserId(req);
    const result = await amendments.requestCancellation({
        dealId: req.params.id,
        userId,
        input: req.body,
    });
    res.status(201).json(result);
}
export async function listCancellations(req, res) {
    const userId = requireUserId(req);
    const result = await amendments.listCancellations({ dealId: req.params.id, userId });
    res.status(200).json(result);
}
export async function decideCancellation(req, res) {
    const userId = requireUserId(req);
    const result = await amendments.decideCancellation({
        dealId: req.params.id,
        cancellationId: req.params.cancellationId,
        userId,
        input: req.body,
    });
    res.status(200).json(result);
}
export async function decideCancellationAsMiddleman(req, res) {
    const userId = requireUserId(req);
    const result = await amendments.decideCancellationAsMiddleman({
        dealId: req.params.id,
        cancellationId: req.params.cancellationId,
        userId,
        input: req.body,
    });
    res.status(200).json(result);
}
//# sourceMappingURL=amendment.controller.js.map