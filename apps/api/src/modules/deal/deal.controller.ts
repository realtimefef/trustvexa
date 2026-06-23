/**
 * Deal HTTP controllers (task 4.1).
 *
 * Thin translation between HTTP and the deal services. The authenticated user
 * id comes from the verified JWT (`req.auth`), never from the request body, so
 * a client cannot create or duplicate deals as someone else. Create and
 * duplicate return 201; draft writes return 200 and a delete returns 204.
 */
import type { Request, Response } from 'express';

import * as creation from './deal-creation.service.js';
import * as drafts from './deal-draft.service.js';
import * as service from './deal.service.js';
import type { CreateDealInput, SaveDraftInput, UpdateTagsInput } from './deal.schemas.js';
function requireUserId(req: Request): string {
  const userId = req.auth?.userId;
  if (!userId) {
    // The role guard (slot 7) should already have rejected anonymous access;
    // this is a defensive belt-and-suspenders check.
    throw new Error('Authenticated user id missing after auth middleware.');
  }
  return userId;
}

export async function createDeal(req: Request, res: Response): Promise<void> {
  const sellerId = requireUserId(req);
  const result = await creation.createDeal({ sellerId, input: req.body as CreateDealInput });
  res.status(201).json(result);
}

export async function duplicateDeal(req: Request, res: Response): Promise<void> {
  const sellerId = requireUserId(req);
  const result = await creation.duplicateDeal({ sellerId, sourceDealId: req.params.id! });
  res.status(201).json(result);
}

export async function saveDraft(req: Request, res: Response): Promise<void> {
  const userId = requireUserId(req);
  const result = await drafts.saveDraft(userId, req.body as SaveDraftInput);
  res.status(200).json(result);
}

export async function listDrafts(req: Request, res: Response): Promise<void> {
  const userId = requireUserId(req);
  const result = await drafts.listDrafts(userId);
  res.status(200).json({ drafts: result });
}

export async function getDraft(req: Request, res: Response): Promise<void> {
  const userId = requireUserId(req);
  const result = await drafts.getDraft(userId, req.params.id!);
  res.status(200).json(result);
}

export async function deleteDraft(req: Request, res: Response): Promise<void> {
  const userId = requireUserId(req);
  await drafts.deleteDraft(userId, req.params.id!);
  res.status(204).end();
}

export async function updateTags(req: Request, res: Response): Promise<void> {
  const userId = requireUserId(req);
  const dealId = req.params.id!;
  const body = req.body as UpdateTagsInput;
  await service.updateDealTags(userId, dealId, body.tags);
  res.status(200).json({ success: true });
}

/** Seller edits deal parameters before both parties lock. */
export async function updateDeal(req: Request, res: Response): Promise<void> {
  const sellerId = requireUserId(req);
  const dealId = req.params.id!;
  const result = await service.updateDeal(sellerId, dealId, req.body as service.UpdateDealInput);
  res.status(200).json(result);
}

/** Mark deal done — closes all chat rooms for the deal. */
export async function markDealDone(req: Request, res: Response): Promise<void> {
  const userId = requireUserId(req);
  const dealId = req.params.id!;
  const result = await service.markDealDone(userId, dealId);
  res.status(200).json(result);
}

/** One-click: attach an available middleman to the deal (buyer or seller). */
export async function requestMiddleman(req: Request, res: Response): Promise<void> {
  const userId = requireUserId(req);
  const dealId = req.params.id!;
  const result = await service.requestMiddleman(userId, dealId);
  res.status(200).json(result);
}

/** Mark the caller's agreement; locks the deal once both parties agree. */
export async function agreeToDeal(req: Request, res: Response): Promise<void> {
  const userId = requireUserId(req);
  const dealId = req.params.id!;
  const result = await service.agreeToDeal(userId, dealId);
  res.status(200).json(result);
}

/** Buyer/middleman manually confirms funding — transitions Confirmed → Funded. */
export async function confirmFunding(req: Request, res: Response): Promise<void> {
  const userId = requireUserId(req);
  const dealId = req.params.id!;
  const requestId = req.header('Idempotency-Key') ?? `${dealId}:confirm-funding:${userId}`;
  const result = await service.confirmFunding(userId, dealId, requestId);
  res.status(200).json(result);
}

/** Seller submits handover — transitions Funded → SellerHandover. */
export async function sellerHandover(req: Request, res: Response): Promise<void> {
  const sellerId = requireUserId(req);
  const dealId = req.params.id!;
  const requestId = req.header('Idempotency-Key') ?? `${dealId}:handover:${sellerId}`;
  const result = await service.sellerHandover(sellerId, dealId, requestId);
  res.status(200).json(result);
}

/** Middleman confirms delivery to buyer — transitions MiddlemanVerified → Delivered. */
export async function deliverToBuyer(req: Request, res: Response): Promise<void> {
  const middlemanId = requireUserId(req);
  const dealId = req.params.id!;
  const requestId = req.header('Idempotency-Key') ?? `${dealId}:deliver:${middlemanId}`;
  const result = await service.deliverToBuyer(middlemanId, dealId, requestId);
  res.status(200).json(result);
}

/** Buyer approves delivery — transitions Delivered → Approved. */
export async function approveDeal(req: Request, res: Response): Promise<void> {
  const userId = requireUserId(req);
  const dealId = req.params.id!;
  const requestId = req.header('Idempotency-Key') ?? `${dealId}:approve:${userId}`;
  const result = await service.approveDeal(userId, dealId, requestId);
  res.status(200).json(result);
}

/** Middleman confirms seller handover — transitions SellerHandover → MiddlemanVerified. */
export async function verifyHandover(req: Request, res: Response): Promise<void> {
  const middlemanId = requireUserId(req);
  const dealId = req.params.id!;
  const requestId = req.header('Idempotency-Key') ?? `${dealId}:verify-handover:${middlemanId}`;
  const result = await service.verifyHandover(middlemanId, dealId, requestId);
  res.status(200).json(result);
}

/**
 * Middleman-only: modify a deal's amount, terms, or status after it is locked.
 * Only the deal's assigned middleman may call this.
 */
export async function middlemanUpdateDeal(req: Request, res: Response): Promise<void> {
  const middlemanId = requireUserId(req);
  const dealId = req.params.id!;
  const result = await service.middlemanUpdateDeal(
    middlemanId,
    dealId,
    req.body as service.MiddlemanUpdateDealInput,
  );
  res.status(200).json(result);
}
