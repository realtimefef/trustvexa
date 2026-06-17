import { Router } from 'express';
import { asyncHandler } from '../../lib/async-handler.js';
import { apiChain } from '../../routes/api-chain.js';
import * as controller from './totp.controller.js';

export function totpRouter(): Router {
  const router = Router();

  // setup TOTP (returns secret + QR URI)
  router.post(
    '/setup',
    ...apiChain({ roles: ['user', 'middleman'] }),
    asyncHandler(controller.setup),
  );

  // confirm first TOTP token to activate 2FA
  router.post(
    '/confirm',
    ...apiChain({ roles: ['user', 'middleman'] }),
    asyncHandler(controller.confirm),
  );

  // disable TOTP (requires current TOTP code)
  router.delete(
    '/',
    ...apiChain({ roles: ['user', 'middleman'] }),
    asyncHandler(controller.disable),
  );

  // regenerate backup codes (requires current TOTP code)
  router.post(
    '/backup-codes',
    ...apiChain({ roles: ['user', 'middleman'] }),
    asyncHandler(controller.regenerateBackupCodes),
  );

  // verify TOTP during login (public route)
  router.post('/verify', ...apiChain(), asyncHandler(controller.verify));

  return router;
}
