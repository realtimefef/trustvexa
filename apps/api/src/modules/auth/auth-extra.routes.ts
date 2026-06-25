/**
 * Additional auth-domain routers (tasks 3.6–3.10).
 *
 *  - recoveryRouter  → mounted at /auth     (verification, recovery, credential
 *                                            changes, step-up)
 *  - sessionsRouter  → mounted at /auth/sessions (device list + revoke + log)
 *  - accountRouter   → mounted at /account   (deactivate / reactivate / delete)
 *
 * Every route runs the fixed middleware chain (slot 5–9) via `apiChain`, so
 * validation, auth, role-guard, rate-limit and idempotency stay in the exact
 * normative order. (Requirement 44.3)
 */
import { Router } from 'express';

import { asyncHandler } from '../../lib/async-handler.js';
import { apiChain } from '../../routes/api-chain.js';
import * as account from './account.controller.js';
import {
  accountActionSchema,
  changeEmailSchema,
  changePasswordSchema,
  confirmStepUpSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  setRecoveryEmailSchema,
  stepUpSchema,
  verifyEmailSchema,
  acceptPolicySchema,
} from './auth.schemas.js';
import * as recovery from './recovery.controller.js';
import * as sessions from './sessions.controller.js';

const AUTHED: Array<'user' | 'middleman'> = ['user', 'middleman'];

/** Verification, recovery, credential-change and step-up routes (mounted at /auth). */
export function recoveryRouter(): Router {
  const router = Router();

  // Public, token-based.
  router.post(
    '/verify-email',
    ...apiChain({ schemas: { body: verifyEmailSchema } }),
    asyncHandler(recovery.verifyEmail),
  );
  router.post(
    '/forgot-password',
    ...apiChain({
      schemas: { body: forgotPasswordSchema },
      rateLimit: { windowSeconds: 3600, max: 10 },
    }),
    asyncHandler(recovery.forgotPassword),
  );
  // Alias used by the web client's forgot-password page.
  router.post(
    '/password-reset/request',
    ...apiChain({
      schemas: { body: forgotPasswordSchema },
      rateLimit: { windowSeconds: 3600, max: 10 },
    }),
    asyncHandler(recovery.forgotPassword),
  );
  router.post(
    '/reset-password',
    ...apiChain({ schemas: { body: resetPasswordSchema } }),
    asyncHandler(recovery.resetPassword),
  );

  // Authenticated.
  router.post(
    '/request-email-verification',
    ...apiChain({ roles: AUTHED }),
    asyncHandler(recovery.requestEmailVerification),
  );
  router.post(
    '/change-password',
    ...apiChain({ roles: AUTHED, schemas: { body: changePasswordSchema } }),
    asyncHandler(recovery.changePassword),
  );
  router.post(
    '/change-email',
    ...apiChain({ roles: AUTHED, schemas: { body: changeEmailSchema } }),
    asyncHandler(recovery.changeEmail),
  );
  router.post(
    '/recovery-email',
    ...apiChain({ roles: AUTHED, schemas: { body: setRecoveryEmailSchema } }),
    asyncHandler(recovery.setRecoveryEmail),
  );
  router.post(
    '/step-up',
    ...apiChain({ roles: AUTHED, schemas: { body: stepUpSchema } }),
    asyncHandler(recovery.requestStepUp),
  );
  router.post(
    '/step-up/confirm',
    ...apiChain({ roles: AUTHED, schemas: { body: confirmStepUpSchema } }),
    asyncHandler(recovery.confirmStepUp),
  );
  router.post(
    '/accept-policy',
    ...apiChain({ roles: AUTHED, schemas: { body: acceptPolicySchema } }),
    asyncHandler(recovery.acceptPolicy),
  );

  return router;
}

/** Session & device management + security log (mounted at /auth/sessions). */
export function sessionsRouter(): Router {
  const router = Router();
  router.get('/', ...apiChain({ roles: AUTHED }), asyncHandler(sessions.list));
  router.get('/security-log', ...apiChain({ roles: AUTHED }), asyncHandler(sessions.securityLog));
  router.delete('/:id', ...apiChain({ roles: AUTHED }), asyncHandler(sessions.revoke));
  return router;
}

/** Account deactivation, reactivation, and deletion (mounted at /account). */
export function accountRouter(): Router {
  const router = Router();
  router.post(
    '/deactivate',
    ...apiChain({ roles: AUTHED, schemas: { body: accountActionSchema } }),
    asyncHandler(account.deactivate),
  );
  router.post('/reactivate', ...apiChain({ roles: AUTHED }), asyncHandler(account.reactivate));
  router.post(
    '/delete',
    ...apiChain({ roles: AUTHED, schemas: { body: accountActionSchema } }),
    asyncHandler(account.requestDeletion),
  );
  return router;
}
