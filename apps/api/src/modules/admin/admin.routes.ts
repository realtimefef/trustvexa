/**
 * Middleman/admin console router (task 7.2), mounted at `/api/v1/admin`.
 *
 * Read-only triage views over the deals a middleman is assigned to. Every route
 * runs the fixed per-route chain via `apiChain` and is restricted to the
 * `middleman` role; these are reads, so no Idempotency-Key is enforced.
 */
import { Router } from 'express';
import { z } from 'zod';

import { asyncHandler } from '../../lib/async-handler.js';
import { apiChain } from '../../routes/api-chain.js';
import { dealIdParamSchema } from '../deal/deal.schemas.js';
import * as controller from './admin.controller.js';
import * as ops from './admin-ops.controller.js';
import * as extra from './admin-extra.controller.js';

const settingChangeBodySchema = z.object({
  settingKey: z.string().min(1).max(100),
  oldValue: z.string().max(4000),
  newValue: z.string().max(4000),
  reason: z.string().trim().min(1).max(2000),
});

const settingChangeQuerySchema = z.object({ settingKey: z.string().min(1).max(100) });

const changeIdParamSchema = z.object({ changeId: z.string().uuid() });

const enforceParamsSchema = z.object({
  userId: z.string().uuid(),
  action: z.enum(['block', 'unblock', 'label', 'trust-downgrade']),
});

const enforceBodySchema = z.object({
  reason: z.string().trim().min(1).max(2000),
  label: z
    .enum(['new_user', 'good_standing', 'trusted', 'high_risk', 'middleman_verified'])
    .optional(),
  amount: z.number().int().positive().max(100).optional(),
});

const reasonBodySchema = z.object({ reason: z.string().trim().min(1).max(2000) });
const legalHoldBodySchema = z.object({
  targetType: z.enum(['deal', 'user']),
  targetId: z.string().uuid(),
  reason: z.string().trim().min(1).max(2000),
});
const appealDecisionBodySchema = z.object({
  decision: z.enum(['approved', 'rejected']),
  decisionReason: z.string().trim().min(1).max(2000),
});
const amlStatusBodySchema = z.object({
  status: z.enum(['open', 'reviewing', 'cleared', 'escalated', 'closed']),
});
const breakGlassBodySchema = z.object({
  actorLabel: z.string().trim().min(1).max(200),
  action: z.enum(['recovery_initiated', 'access_restored', 'procedure_tested']),
  reason: z.string().trim().min(1).max(2000),
});
const piiLookupBodySchema = z.object({
  fields: z.array(z.enum(['email', 'signup_details', 'recovery_email'])).min(1),
  reason: z.string().trim().min(1).max(2000),
});
const allowlistBodySchema = z.object({
  coin: z.string().trim().min(1).max(20),
  network: z.string().trim().min(1).max(40),
  address: z.string().trim().min(4).max(200),
  label: z.string().trim().max(200).optional().nullable(),
  delayHours: z.number().int().min(0).max(168).optional(),
});
const holdIdParamSchema = z.object({ holdId: z.string().uuid() });
const pauseIdParamSchema = z.object({ pauseId: z.string().uuid() });
const flagKeyParamSchema = z.object({ key: z.string().trim().min(1).max(100) });
const noteParamsSchema = z.object({
  targetType: z.enum(['deal', 'user']),
  targetId: z.string().uuid(),
});
const holdBodySchema = z.object({
  holdType: z.string().trim().min(1).max(100),
  reason: z.string().trim().min(1).max(2000),
  visibleMessage: z.string().trim().max(2000).nullish(),
});
const overrideBodySchema = z.object({
  overrideType: z.string().trim().min(1).max(100),
  oldValue: z.string().max(4000),
  newValue: z.string().max(4000),
  reason: z.string().trim().min(1).max(2000),
  confirmed: z.boolean(),
});
const noteBodySchema = z.object({ note: z.string().trim().min(1).max(4000) });
const pauseBodySchema = z.object({
  scope: z.enum(['new_deals', 'deposits', 'payouts', 'withdrawals', 'signups', 'chain']),
  reason: z.string().trim().min(1).max(2000),
});
const flagToggleBodySchema = z.object({
  isEnabled: z.boolean(),
  reason: z.string().trim().max(2000).optional(),
});
const postAnnouncementSchema = z.object({
  title: z.string().trim().min(1).max(200),
  body: z.string().trim().min(1).max(2000),
  audience: z.enum(['all', 'user', 'middleman']),
  startsAt: z.string().datetime().optional().nullish(),
  endsAt: z.string().datetime().optional().nullish(),
});

export function adminRouter(): Router {
  const router = Router();

  // GET /api/v1/admin/queue — assigned deals, waiting-on-you first, with the
  // middleman's next actions and a small summary.
  router.get('/queue', ...apiChain({ roles: ['middleman'] }), asyncHandler(controller.getQueue));

  // GET /api/v1/admin/disputes — open / under-review disputes to triage.
  router.get(
    '/disputes',
    ...apiChain({ roles: ['middleman'] }),
    asyncHandler(controller.getDisputes),
  );

  // GET /api/v1/admin/risk/:id — risk/enforcement panel for an assigned deal.
  router.get(
    '/risk/:id',
    ...apiChain({ schemas: { params: dealIdParamSchema }, roles: ['middleman'] }),
    asyncHandler(controller.getRisk),
  );

  // GET /api/v1/admin/settings/critical — catalog of change-controlled keys.
  router.get(
    '/settings/critical',
    ...apiChain({ roles: ['middleman'] }),
    asyncHandler(controller.getCriticalSettings),
  );

  // GET /api/v1/admin/settings/changes?settingKey=… — audit history for a key.
  router.get(
    '/settings/changes',
    ...apiChain({ schemas: { query: settingChangeQuerySchema }, roles: ['middleman'] }),
    asyncHandler(controller.listSettingChanges),
  );

  // POST /api/v1/admin/settings/changes — request a change (reason + preview +
  // cooldown for critical keys).
  router.post(
    '/settings/changes',
    ...apiChain({ schemas: { body: settingChangeBodySchema }, roles: ['middleman'] }),
    asyncHandler(controller.requestSettingChange),
  );

  // POST /api/v1/admin/settings/changes/:changeId/apply — apply once cooldown elapses.
  router.post(
    '/settings/changes/:changeId/apply',
    ...apiChain({ schemas: { params: changeIdParamSchema }, roles: ['middleman'] }),
    asyncHandler(controller.applySettingChange),
  );

  // POST /api/v1/admin/settings/changes/:changeId/rollback — roll back an applied change.
  router.post(
    '/settings/changes/:changeId/rollback',
    ...apiChain({ schemas: { params: changeIdParamSchema }, roles: ['middleman'] }),
    asyncHandler(controller.rollbackSettingChange),
  );

  // POST /api/v1/admin/users/:userId/:action — enforcement (block / unblock /
  // label / trust-downgrade). Audited; middleman-only; requires Idempotency-Key.
  router.post(
    '/users/:userId/:action',
    ...apiChain({
      schemas: { params: enforceParamsSchema, body: enforceBodySchema },
      roles: ['middleman'],
      enforceIdempotency: true,
    }),
    asyncHandler(controller.enforce),
  );

  router.patch(
    '/users/:userId/block',
    ...apiChain({
      schemas: {
        params: z.object({ userId: z.string().uuid() }),
        body: reasonBodySchema,
      },
      roles: ['middleman'],
      enforceIdempotency: true,
    }),
    asyncHandler(controller.blockUser),
  );

  router.delete(
    '/users/:userId',
    ...apiChain({
      schemas: {
        params: z.object({ userId: z.string().uuid() }),
        body: reasonBodySchema,
      },
      roles: ['middleman'],
      enforceIdempotency: true,
    }),
    asyncHandler(controller.deleteUser),
  );

  // ── Extended admin operations (Plan §25/§33/§4) ───────────────────────────

  // Search / analytics (read-only).
  router.get('/deals', ...apiChain({ roles: ['middleman'] }), asyncHandler(ops.searchDeals));
  router.get('/users', ...apiChain({ roles: ['middleman'] }), asyncHandler(ops.searchUsers));
  router.get('/analytics', ...apiChain({ roles: ['middleman'] }), asyncHandler(ops.getAnalytics));

  // Manual review holds.
  router.get('/holds', ...apiChain({ roles: ['middleman'] }), asyncHandler(ops.listHolds));
  router.post(
    '/deals/:id/hold',
    ...apiChain({
      schemas: { params: dealIdParamSchema, body: holdBodySchema },
      roles: ['middleman'],
      enforceIdempotency: true,
    }),
    asyncHandler(ops.placeHold),
  );
  router.post(
    '/holds/:holdId/release',
    ...apiChain({
      schemas: { params: holdIdParamSchema, body: reasonBodySchema },
      roles: ['middleman'],
      enforceIdempotency: true,
    }),
    asyncHandler(ops.releaseHold),
  );

  // Controlled manual overrides.
  router.get('/overrides', ...apiChain({ roles: ['middleman'] }), asyncHandler(ops.listOverrides));
  router.post(
    '/deals/:id/override',
    ...apiChain({
      schemas: { params: dealIdParamSchema, body: overrideBodySchema },
      roles: ['middleman'],
      enforceIdempotency: true,
    }),
    asyncHandler(ops.recordOverride),
  );

  // Private admin notes (targetType in {deal,user}).
  router.get(
    '/notes/:targetType/:targetId',
    ...apiChain({ schemas: { params: noteParamsSchema }, roles: ['middleman'] }),
    asyncHandler(ops.listNotes),
  );
  router.post(
    '/notes/:targetType/:targetId',
    ...apiChain({
      schemas: { params: noteParamsSchema, body: noteBodySchema },
      roles: ['middleman'],
      enforceIdempotency: true,
    }),
    asyncHandler(ops.addNote),
  );

  // Emergency pause / circuit breaker.
  router.get('/pause', ...apiChain({ roles: ['middleman'] }), asyncHandler(ops.listPauses));
  router.post(
    '/pause',
    ...apiChain({
      schemas: { body: pauseBodySchema },
      roles: ['middleman'],
      enforceIdempotency: true,
    }),
    asyncHandler(ops.startPause),
  );
  router.delete(
    '/pause/:pauseId',
    ...apiChain({ schemas: { params: pauseIdParamSchema }, roles: ['middleman'] }),
    asyncHandler(ops.endPause),
  );

  // Feature flags / kill switch.
  router.get(
    '/feature-flags',
    ...apiChain({ roles: ['middleman'] }),
    asyncHandler(ops.listFeatureFlags),
  );
  router.patch(
    '/feature-flags/:key',
    ...apiChain({
      schemas: { params: flagKeyParamSchema, body: flagToggleBodySchema },
      roles: ['middleman'],
      enforceIdempotency: true,
    }),
    asyncHandler(ops.toggleFeatureFlag),
  );

  // Audit timeline
  router.get('/audit-log', ...apiChain({ roles: ['middleman'] }), asyncHandler(ops.getAuditLog));

  // Announcements creation
  router.post(
    '/announcements',
    ...apiChain({
      schemas: { body: postAnnouncementSchema },
      roles: ['middleman'],
      enforceIdempotency: true,
    }),
    asyncHandler(ops.createAnnouncement),
  );

  // Chat moderation
  router.get('/chats', ...apiChain({ roles: ['middleman'] }), asyncHandler(ops.searchChats));
  router.delete(
    '/chats/:chatId',
    ...apiChain({
      schemas: {
        params: z.object({ chatId: z.string().uuid() }),
        body: reasonBodySchema,
      },
      roles: ['middleman'],
      enforceIdempotency: true,
    }),
    asyncHandler(ops.deleteChat),
  );

  // ── Trust & Safety / Compliance (legal holds, appeals, AML, break-glass, PII) ─

  // Legal holds — evidence-preservation mode (blocks payouts via preflight).
  router.get('/legal-holds', ...apiChain({ roles: ['middleman'] }), asyncHandler(extra.listLegalHolds));
  router.post(
    '/legal-holds',
    ...apiChain({
      schemas: { body: legalHoldBodySchema },
      roles: ['middleman'],
      enforceIdempotency: true,
    }),
    asyncHandler(extra.placeLegalHold),
  );
  router.post(
    '/legal-holds/:holdId/release',
    ...apiChain({
      schemas: { params: z.object({ holdId: z.string().uuid() }), body: reasonBodySchema },
      roles: ['middleman'],
      enforceIdempotency: true,
    }),
    asyncHandler(extra.releaseLegalHold),
  );

  // Appeal / unblock requests.
  router.get('/appeals', ...apiChain({ roles: ['middleman'] }), asyncHandler(extra.listAppeals));
  router.post(
    '/appeals/:appealId/decide',
    ...apiChain({
      schemas: { params: z.object({ appealId: z.string().uuid() }), body: appealDecisionBodySchema },
      roles: ['middleman'],
      enforceIdempotency: true,
    }),
    asyncHandler(extra.decideAppeal),
  );

  // AML / suspicious-activity alerts.
  router.get('/aml-alerts', ...apiChain({ roles: ['middleman'] }), asyncHandler(extra.listAmlAlerts));
  router.patch(
    '/aml-alerts/:alertId',
    ...apiChain({
      schemas: { params: z.object({ alertId: z.string().uuid() }), body: amlStatusBodySchema },
      roles: ['middleman'],
      enforceIdempotency: true,
    }),
    asyncHandler(extra.updateAmlAlert),
  );

  // Break-glass / emergency-recovery audit.
  router.get('/break-glass', ...apiChain({ roles: ['middleman'] }), asyncHandler(extra.listBreakGlass));
  router.post(
    '/break-glass',
    ...apiChain({
      schemas: { body: breakGlassBodySchema },
      roles: ['middleman'],
      enforceIdempotency: true,
    }),
    asyncHandler(extra.recordBreakGlass),
  );

  // Audited PII access (decrypt email / signup details; password never shown).
  router.get('/pii-access-logs', ...apiChain({ roles: ['middleman'] }), asyncHandler(extra.listPiiAccessLogs));
  router.post(
    '/users/:userId/pii',
    ...apiChain({
      schemas: { params: z.object({ userId: z.string().uuid() }), body: piiLookupBodySchema },
      roles: ['middleman'],
      enforceIdempotency: true,
    }),
    asyncHandler(extra.lookupUserPii),
  );

  // Withdrawal allowlist (custody) — operator payout addresses with time-delay.
  router.get('/withdrawal-allowlist', ...apiChain({ roles: ['middleman'] }), asyncHandler(extra.listWithdrawalAllowlist));
  router.post(
    '/withdrawal-allowlist',
    ...apiChain({
      schemas: { body: allowlistBodySchema },
      roles: ['middleman'],
      enforceIdempotency: true,
    }),
    asyncHandler(extra.addWithdrawalAllowlist),
  );
  router.patch(
    '/withdrawal-allowlist/:id',
    ...apiChain({
      schemas: { params: z.object({ id: z.string().uuid() }), body: z.object({ isActive: z.boolean() }) },
      roles: ['middleman'],
      enforceIdempotency: true,
    }),
    asyncHandler(extra.setWithdrawalAllowlistActive),
  );

  return router;
}
