/**
 * Documents feature router (task 7.8), mounted at `/api/v1/documents`.
 * Read-only list of the documents available for a deal the caller is a party
 * to; access is enforced in the service.
 */
import { Router } from 'express';
import { asyncHandler } from '../../lib/async-handler.js';
import { apiChain } from '../../routes/api-chain.js';
import { dealIdParamSchema } from '../deal/deal.schemas.js';
import * as controller from './documents.controller.js';
export function documentsRouter() {
    const router = Router();
    // GET /api/v1/documents/deals/:id — documents available for this deal.
    router.get('/deals/:id', ...apiChain({ schemas: { params: dealIdParamSchema }, roles: ['user', 'middleman'] }), asyncHandler(controller.getDealDocuments));
    // GET /api/v1/documents/deals/:id/agreement.pdf — the deal-agreement PDF.
    router.get('/deals/:id/agreement.pdf', ...apiChain({ schemas: { params: dealIdParamSchema }, roles: ['user', 'middleman'] }), asyncHandler(controller.getAgreementPdf));
    // GET /api/v1/documents/deals/:id/receipt.pdf — branded receipt for a settled deal.
    router.get('/deals/:id/receipt.pdf', ...apiChain({ schemas: { params: dealIdParamSchema }, roles: ['user', 'middleman'] }), asyncHandler(controller.getReceiptPdf));
    // GET /api/v1/documents/deals/:id/dispute-decision.pdf — final decision PDF.
    router.get('/deals/:id/dispute-decision.pdf', ...apiChain({ schemas: { params: dealIdParamSchema }, roles: ['user', 'middleman'] }), asyncHandler(controller.getDisputeDecisionPdf));
    // GET /api/v1/documents/me/export — the caller's own data export (JSON).
    router.get('/me/export', ...apiChain({ roles: ['user', 'middleman'] }), asyncHandler(controller.getDataExport));
    return router;
}
//# sourceMappingURL=documents.routes.js.map