/**
 * Documents HTTP controller (task 7.8). Read-only; the caller id comes from the
 * verified JWT and access is enforced in the service against the deal parties.
 */
import type { Request, Response } from 'express';

import * as service from './documents.service.js';

export async function getDealDocuments(req: Request, res: Response): Promise<void> {
  const userId = req.auth?.userId;
  if (!userId) {
    throw new Error('Authenticated user id missing after auth middleware.');
  }
  const dealId = req.params.id;
  if (!dealId) throw new Error('Missing deal id route parameter.');
  const result = await service.listDealDocuments(userId, dealId);
  res.status(200).json(result);
}

/** Stream the deal-agreement PDF for a party to the deal. */
export async function getAgreementPdf(req: Request, res: Response): Promise<void> {
  const userId = req.auth?.userId;
  if (!userId) {
    throw new Error('Authenticated user id missing after auth middleware.');
  }
  const dealId = req.params.id;
  if (!dealId) throw new Error('Missing deal id route parameter.');
  const { buffer, documentNumber } = await service.buildAgreementPdf(userId, dealId);
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `inline; filename="deal-agreement-${documentNumber}.pdf"`);
  res.status(200).send(buffer);
}

/** Stream the branded receipt PDF for a settled deal the caller is party to. */
export async function getReceiptPdf(req: Request, res: Response): Promise<void> {
  const userId = req.auth?.userId;
  if (!userId) {
    throw new Error('Authenticated user id missing after auth middleware.');
  }
  const dealId = req.params.id;
  if (!dealId) throw new Error('Missing deal id route parameter.');
  const { buffer, documentNumber } = await service.buildReceiptPdf(userId, dealId);
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `inline; filename="receipt-${documentNumber}.pdf"`);
  res.status(200).send(buffer);
}

/** Stream the final dispute-decision PDF for a resolved dispute. */
export async function getDisputeDecisionPdf(req: Request, res: Response): Promise<void> {
  const userId = req.auth?.userId;
  if (!userId) {
    throw new Error('Authenticated user id missing after auth middleware.');
  }
  const dealId = req.params.id;
  if (!dealId) throw new Error('Missing deal id route parameter.');
  const { buffer, documentNumber } = await service.buildDisputeDecisionPdf(userId, dealId);
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `inline; filename="dispute-decision-${documentNumber}.pdf"`);
  res.status(200).send(buffer);
}

/** Download the caller's own data export as JSON (never another user's data). */
export async function getDataExport(req: Request, res: Response): Promise<void> {
  const userId = req.auth?.userId;
  if (!userId) {
    throw new Error('Authenticated user id missing after auth middleware.');
  }
  const data = await service.buildDataExport(userId);
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Content-Disposition', 'attachment; filename="trustvexa-data-export.json"');
  res.status(200).send(JSON.stringify(data, null, 2));
}
