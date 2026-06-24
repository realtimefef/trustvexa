import * as creation from './deal-creation.service.js';
import * as drafts from './deal-draft.service.js';
import * as service from './deal.service.js';
function requireUserId(req) {
    const userId = req.auth?.userId;
    if (!userId) {
        // The role guard (slot 7) should already have rejected anonymous access;
        // this is a defensive belt-and-suspenders check.
        throw new Error('Authenticated user id missing after auth middleware.');
    }
    return userId;
}
export async function createDeal(req, res) {
    const sellerId = requireUserId(req);
    const result = await creation.createDeal({ sellerId, input: req.body });
    res.status(201).json(result);
}
export async function duplicateDeal(req, res) {
    const sellerId = requireUserId(req);
    const result = await creation.duplicateDeal({ sellerId, sourceDealId: req.params.id });
    res.status(201).json(result);
}
export async function saveDraft(req, res) {
    const userId = requireUserId(req);
    const result = await drafts.saveDraft(userId, req.body);
    res.status(200).json(result);
}
export async function listDrafts(req, res) {
    const userId = requireUserId(req);
    const result = await drafts.listDrafts(userId);
    res.status(200).json({ drafts: result });
}
export async function getDraft(req, res) {
    const userId = requireUserId(req);
    const result = await drafts.getDraft(userId, req.params.id);
    res.status(200).json(result);
}
export async function deleteDraft(req, res) {
    const userId = requireUserId(req);
    await drafts.deleteDraft(userId, req.params.id);
    res.status(204).end();
}
export async function updateTags(req, res) {
    const userId = requireUserId(req);
    const dealId = req.params.id;
    const body = req.body;
    await service.updateDealTags(userId, dealId, body.tags);
    res.status(200).json({ success: true });
}
/** Seller edits deal parameters before both parties lock. */
export async function updateDeal(req, res) {
    const sellerId = requireUserId(req);
    const dealId = req.params.id;
    const result = await service.updateDeal(sellerId, dealId, req.body);
    res.status(200).json(result);
}
/** Mark deal done — closes all chat rooms for the deal. */
export async function markDealDone(req, res) {
    const userId = requireUserId(req);
    const dealId = req.params.id;
    const result = await service.markDealDone(userId, dealId);
    res.status(200).json(result);
}
/** One-click: attach an available middleman to the deal (buyer or seller). */
export async function requestMiddleman(req, res) {
    const userId = requireUserId(req);
    const dealId = req.params.id;
    const result = await service.requestMiddleman(userId, dealId);
    res.status(200).json(result);
}
/** Mark the caller's agreement; locks the deal once both parties agree. */
export async function agreeToDeal(req, res) {
    const userId = requireUserId(req);
    const dealId = req.params.id;
    const result = await service.agreeToDeal(userId, dealId);
    res.status(200).json(result);
}
/** Buyer/seller advances a no-middleman deal SellerHandover → Delivered. */
export async function advanceDeliveryNoMiddleman(req, res) {
    const userId = requireUserId(req);
    const dealId = req.params.id;
    const requestId = req.header('Idempotency-Key') ?? `${dealId}:advance-delivery:${userId}`;
    const result = await service.advanceDeliveryNoMiddleman(userId, dealId, requestId);
    res.status(200).json(result);
}
/** Middleman marks the deal complete — chains transitions to Released. */
export async function markDealComplete(req, res) {
    const middlemanId = requireUserId(req);
    const dealId = req.params.id;
    const requestId = req.header('Idempotency-Key') ?? `${dealId}:complete:${middlemanId}`;
    const result = await service.markDealComplete(middlemanId, dealId, requestId);
    res.status(200).json(result);
}
/** Buyer/middleman manually confirms funding — transitions Confirmed → Funded. */
export async function confirmFunding(req, res) {
    const userId = requireUserId(req);
    const dealId = req.params.id;
    const requestId = req.header('Idempotency-Key') ?? `${dealId}:confirm-funding:${userId}`;
    const result = await service.confirmFunding(userId, dealId, requestId);
    res.status(200).json(result);
}
/** Seller submits handover — transitions Funded → SellerHandover. */
export async function sellerHandover(req, res) {
    const sellerId = requireUserId(req);
    const dealId = req.params.id;
    const requestId = req.header('Idempotency-Key') ?? `${dealId}:handover:${sellerId}`;
    const result = await service.sellerHandover(sellerId, dealId, requestId);
    res.status(200).json(result);
}
/** Middleman confirms delivery to buyer — transitions MiddlemanVerified → Delivered. */
export async function deliverToBuyer(req, res) {
    const middlemanId = requireUserId(req);
    const dealId = req.params.id;
    const requestId = req.header('Idempotency-Key') ?? `${dealId}:deliver:${middlemanId}`;
    const result = await service.deliverToBuyer(middlemanId, dealId, requestId);
    res.status(200).json(result);
}
/** Buyer approves delivery — transitions Delivered → Approved. */
export async function approveDeal(req, res) {
    const userId = requireUserId(req);
    const dealId = req.params.id;
    const requestId = req.header('Idempotency-Key') ?? `${dealId}:approve:${userId}`;
    const result = await service.approveDeal(userId, dealId, requestId);
    res.status(200).json(result);
}
/** Middleman confirms seller handover — transitions SellerHandover → MiddlemanVerified. */
export async function verifyHandover(req, res) {
    const middlemanId = requireUserId(req);
    const dealId = req.params.id;
    const requestId = req.header('Idempotency-Key') ?? `${dealId}:verify-handover:${middlemanId}`;
    const result = await service.verifyHandover(middlemanId, dealId, requestId);
    res.status(200).json(result);
}
/**
 * Middleman-only: modify a deal's amount, terms, or status after it is locked.
 * Only the deal's assigned middleman may call this.
 */
export async function middlemanUpdateDeal(req, res) {
    const middlemanId = requireUserId(req);
    const dealId = req.params.id;
    const result = await service.middlemanUpdateDeal(middlemanId, dealId, req.body);
    res.status(200).json(result);
}
//# sourceMappingURL=deal.controller.js.map