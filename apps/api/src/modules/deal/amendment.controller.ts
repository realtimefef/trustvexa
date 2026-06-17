/**
 * Amendment & mutual-cancellation HTTP controllers (task 4.8). The
 * authenticated user id comes from the verified JWT (`req.auth`), never the
 * request body.
 */
import type { Request, Response } from 'express';

import * as amendments from './amendment.service.js';
import type {
  DecisionInput,
  MiddlemanDecisionInput,
  RequestAmendmentInput,
  RequestCancellationInput,
} from './amendment.schemas.js';

function requireUserId(req: Request): string {
  const userId = req.auth?.userId;
  if (!userId) {
    throw new Error('Authenticated user id missing after auth middleware.');
  }
  return userId;
}

export async function requestAmendment(req: Request, res: Response): Promise<void> {
  const userId = requireUserId(req);
  const result = await amendments.requestAmendment({
    dealId: req.params.id!,
    userId,
    input: req.body as RequestAmendmentInput,
  });
  res.status(201).json(result);
}

export async function listAmendments(req: Request, res: Response): Promise<void> {
  const userId = requireUserId(req);
  const result = await amendments.listAmendments({ dealId: req.params.id!, userId });
  res.status(200).json(result);
}

export async function decideAmendment(req: Request, res: Response): Promise<void> {
  const userId = requireUserId(req);
  const result = await amendments.decideAmendment({
    dealId: req.params.id!,
    amendmentId: req.params.amendmentId!,
    userId,
    input: req.body as DecisionInput,
  });
  res.status(200).json(result);
}

export async function requestCancellation(req: Request, res: Response): Promise<void> {
  const userId = requireUserId(req);
  const result = await amendments.requestCancellation({
    dealId: req.params.id!,
    userId,
    input: req.body as RequestCancellationInput,
  });
  res.status(201).json(result);
}

export async function listCancellations(req: Request, res: Response): Promise<void> {
  const userId = requireUserId(req);
  const result = await amendments.listCancellations({ dealId: req.params.id!, userId });
  res.status(200).json(result);
}

export async function decideCancellation(req: Request, res: Response): Promise<void> {
  const userId = requireUserId(req);
  const result = await amendments.decideCancellation({
    dealId: req.params.id!,
    cancellationId: req.params.cancellationId!,
    userId,
    input: req.body as DecisionInput,
  });
  res.status(200).json(result);
}

export async function decideCancellationAsMiddleman(req: Request, res: Response): Promise<void> {
  const userId = requireUserId(req);
  const result = await amendments.decideCancellationAsMiddleman({
    dealId: req.params.id!,
    cancellationId: req.params.cancellationId!,
    userId,
    input: req.body as MiddlemanDecisionInput,
  });
  res.status(200).json(result);
}
