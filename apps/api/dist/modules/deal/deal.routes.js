/**
 * Deal feature router (tasks 4.1, 4.3, 4.5, 4.7, 4.8), mounted at
 * `/api/v1/deals`.
 *
 * Every route runs the fixed per-route chain (validation -> jwt -> role guard
 * -> rate limit -> idempotency) via `apiChain`. All routes require an
 * authenticated account. Routes that change state enforce an Idempotency-Key
 * (Requirement 17.13); read-only routes do not. Literal `/drafts` routes are
 * registered before the `/:id` param route so they match first.
 */
import { Router } from 'express';
import { asyncHandler } from '../../lib/async-handler.js';
import { rateLimiter } from '../../middleware/rate-limit.js';
import { apiChain } from '../../routes/api-chain.js';
import * as amendmentController from './amendment.controller.js';
import { amendmentParamSchema, cancellationParamSchema, decisionSchema, middlemanDecisionSchema, requestAmendmentSchema, requestCancellationSchema, } from './amendment.schemas.js';
import * as controller from './deal.controller.js';
import { createDealSchema, dealIdParamSchema, draftIdParamSchema, middlemanUpdateDealSchema, saveDraftSchema, updateDealSchema, updateTagsSchema, } from './deal.schemas.js';
import * as inviteController from './invite.controller.js';
import { createInviteSchema } from './invite.schemas.js';
import * as termsController from './terms.controller.js';
import { acceptTermsSchema } from './terms.schemas.js';
import * as verificationController from './verification.controller.js';
import { submitVerificationSchema } from './verification.schemas.js';
const ACCOUNT_ROLES = ['user', 'middleman'];
export function dealRouter() {
    const router = Router();
    router.post('/', ...apiChain({
        schemas: { body: createDealSchema },
        roles: [...ACCOUNT_ROLES],
        enforceIdempotency: true,
        rateLimit: { windowSeconds: 86400, max: 10 },
    }), asyncHandler(controller.createDeal));
    router.post('/drafts', ...apiChain({ schemas: { body: saveDraftSchema }, roles: [...ACCOUNT_ROLES] }), asyncHandler(controller.saveDraft));
    router.get('/drafts', ...apiChain({ roles: [...ACCOUNT_ROLES] }), asyncHandler(controller.listDrafts));
    router.get('/drafts/:id', ...apiChain({ schemas: { params: draftIdParamSchema }, roles: [...ACCOUNT_ROLES] }), asyncHandler(controller.getDraft));
    router.delete('/drafts/:id', ...apiChain({ schemas: { params: draftIdParamSchema }, roles: [...ACCOUNT_ROLES] }), asyncHandler(controller.deleteDraft));
    router.post('/:id/duplicate', ...apiChain({
        schemas: { params: dealIdParamSchema },
        roles: [...ACCOUNT_ROLES],
        enforceIdempotency: true,
    }), asyncHandler(controller.duplicateDeal));
    // Seller edits deal parameters before locking (amount, feePayer, coin, network, terms, etc.)
    router.patch('/:id', ...apiChain({
        schemas: { params: dealIdParamSchema, body: updateDealSchema },
        roles: [...ACCOUNT_ROLES],
    }), asyncHandler(controller.updateDeal));
    // --- Invites (task 4.3) ------------------------------------------------
    router.post('/:id/invites', ...apiChain({
        schemas: { params: dealIdParamSchema, body: createInviteSchema },
        roles: [...ACCOUNT_ROLES],
        enforceIdempotency: true,
    }), asyncHandler(inviteController.createInvite));
    router.get('/:id/invites', ...apiChain({ schemas: { params: dealIdParamSchema }, roles: [...ACCOUNT_ROLES] }), asyncHandler(inviteController.listInvites));
    // --- 48-digit verification code (task 4.5) -----------------------------
    router.post('/:id/verification-code', ...apiChain({
        schemas: { params: dealIdParamSchema },
        roles: [...ACCOUNT_ROLES],
        enforceIdempotency: true,
    }), asyncHandler(verificationController.requestCode));
    router.post('/:id/verification-code/verify', ...apiChain({
        schemas: { params: dealIdParamSchema, body: submitVerificationSchema },
        roles: [...ACCOUNT_ROLES],
        enforceIdempotency: true,
    }), 
    // Tight per-(user,deal) limiter on top of the global slot-8 limiter so code
    // guessing is throttled even within one rate window (Requirement 10.6).
    rateLimiter({ windowSeconds: 60, max: 8, prefix: 'vc' }), asyncHandler(verificationController.submitCode));
    // --- Terms, legal acceptances, final confirmation (task 4.7) -----------
    router.get('/:id/agreement', ...apiChain({ schemas: { params: dealIdParamSchema }, roles: [...ACCOUNT_ROLES] }), asyncHandler(termsController.getAgreement));
    router.post('/:id/terms/accept', ...apiChain({
        schemas: { params: dealIdParamSchema, body: acceptTermsSchema },
        roles: [...ACCOUNT_ROLES],
        enforceIdempotency: true,
    }), asyncHandler(termsController.acceptTerms));
    // --- Amendments & mutual cancellation (task 4.8) -----------------------
    router.post('/:id/amendments', ...apiChain({
        schemas: { params: dealIdParamSchema, body: requestAmendmentSchema },
        roles: [...ACCOUNT_ROLES],
        enforceIdempotency: true,
    }), asyncHandler(amendmentController.requestAmendment));
    router.get('/:id/amendments', ...apiChain({ schemas: { params: dealIdParamSchema }, roles: [...ACCOUNT_ROLES] }), asyncHandler(amendmentController.listAmendments));
    router.post('/:id/amendments/:amendmentId/decision', ...apiChain({
        schemas: { params: amendmentParamSchema, body: decisionSchema },
        roles: [...ACCOUNT_ROLES],
        enforceIdempotency: true,
    }), asyncHandler(amendmentController.decideAmendment));
    router.post('/:id/cancellations', ...apiChain({
        schemas: { params: dealIdParamSchema, body: requestCancellationSchema },
        roles: [...ACCOUNT_ROLES],
        enforceIdempotency: true,
    }), asyncHandler(amendmentController.requestCancellation));
    router.get('/:id/cancellations', ...apiChain({ schemas: { params: dealIdParamSchema }, roles: [...ACCOUNT_ROLES] }), asyncHandler(amendmentController.listCancellations));
    router.post('/:id/cancellations/:cancellationId/decision', ...apiChain({
        schemas: { params: cancellationParamSchema, body: decisionSchema },
        roles: [...ACCOUNT_ROLES],
        enforceIdempotency: true,
    }), asyncHandler(amendmentController.decideCancellation));
    router.post('/:id/cancellations/:cancellationId/middleman-decision', ...apiChain({
        schemas: { params: cancellationParamSchema, body: middlemanDecisionSchema },
        roles: [...ACCOUNT_ROLES],
        enforceIdempotency: true,
    }), asyncHandler(amendmentController.decideCancellationAsMiddleman));
    router.put('/:id/tags', ...apiChain({
        schemas: { params: dealIdParamSchema, body: updateTagsSchema },
        roles: [...ACCOUNT_ROLES],
    }), asyncHandler(controller.updateTags));
    // One-click middleman attach (no invite / no access request).
    router.post('/:id/request-middleman', ...apiChain({
        schemas: { params: dealIdParamSchema },
        roles: [...ACCOUNT_ROLES],
        enforceIdempotency: true,
    }), asyncHandler(controller.requestMiddleman));
    // Mutual-agreement lock: each party agrees; both => deal locks (immutable).
    router.post('/:id/agree', ...apiChain({
        schemas: { params: dealIdParamSchema },
        roles: [...ACCOUNT_ROLES],
        enforceIdempotency: true,
    }), asyncHandler(controller.agreeToDeal));
    // Mark deal done — closes all chat rooms so they become read-only.
    router.post('/:id/done', ...apiChain({
        schemas: { params: dealIdParamSchema },
        roles: [...ACCOUNT_ROLES],
        enforceIdempotency: true,
    }), asyncHandler(controller.markDealDone));
    // Middleman confirms delivery to buyer — MiddlemanVerified → Delivered.
    router.post('/:id/deliver', ...apiChain({
        schemas: { params: dealIdParamSchema },
        roles: ['middleman'],
        enforceIdempotency: true,
    }), asyncHandler(controller.deliverToBuyer));
    // Buyer approves delivery — Delivered → Approved.
    router.post('/:id/approve', ...apiChain({
        schemas: { params: dealIdParamSchema },
        roles: [...ACCOUNT_ROLES],
        enforceIdempotency: true,
    }), asyncHandler(controller.approveDeal));
    // Middleman confirms the seller has completed the handover.
    // SellerHandover → MiddlemanVerified transition.
    router.post('/:id/handover/verify', ...apiChain({
        schemas: { params: dealIdParamSchema },
        roles: ['middleman'],
        enforceIdempotency: true,
    }), asyncHandler(controller.verifyHandover));
    // Middleman-only: modify deal terms, amount, or status after lock.
    // Only the deal's assigned middleman may call this endpoint.
    router.patch('/:id/middleman-update', ...apiChain({
        schemas: { params: dealIdParamSchema, body: middlemanUpdateDealSchema },
        roles: ['middleman'],
        enforceIdempotency: true,
    }), asyncHandler(controller.middlemanUpdateDeal));
    return router;
}
//# sourceMappingURL=deal.routes.js.map