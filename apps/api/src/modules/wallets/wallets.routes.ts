/**
 * Wallets feature router, mounted at `/api/v1/wallets` by the parent.
 *
 * Every route requires an authenticated account (roles `user` | `middleman`),
 * and the service layer scopes all reads/writes to the JWT user id so a caller
 * only ever touches their own saved wallets and change requests. Writes that
 * create rows (add address, create change request) enforce an Idempotency-Key
 * via the api chain and are idempotent in the service.
 */
import { Router } from 'express';

import { asyncHandler } from '../../lib/async-handler.js';
import { apiChain } from '../../routes/api-chain.js';
import * as controller from './wallets.controller.js';
import {
  addAddressSchema,
  addressIdParamSchema,
  changeRequestSchema,
  validateAddressSchema,
  withdrawSchema,
} from './wallets.schemas.js';

export function walletsRouter(): Router {
  const router = Router();

  router.get(
    '/',
    ...apiChain({ roles: ['user', 'middleman'] }),
    asyncHandler(controller.getWalletInfo),
  );

  router.post(
    '/withdraw',
    ...apiChain({
      schemas: { body: withdrawSchema },
      roles: ['user', 'middleman'],
      enforceIdempotency: true,
      rateLimit: { windowSeconds: 3600, max: 3, failClosed: true },
    }),
    asyncHandler(controller.withdraw),
  );

  router.get(
    '/address-book',
    ...apiChain({ roles: ['user', 'middleman'] }),
    asyncHandler(controller.listAddressBook),
  );

  router.post(
    '/address-book',
    ...apiChain({
      schemas: { body: addAddressSchema },
      roles: ['user', 'middleman'],
      enforceIdempotency: true,
    }),
    asyncHandler(controller.addAddress),
  );

  router.delete(
    '/address-book/:id',
    ...apiChain({
      schemas: { params: addressIdParamSchema },
      roles: ['user', 'middleman'],
    }),
    asyncHandler(controller.deleteAddress),
  );

  router.post(
    '/validate',
    ...apiChain({
      schemas: { body: validateAddressSchema },
      roles: ['user', 'middleman'],
    }),
    asyncHandler(controller.validateAddress),
  );

  router.post(
    '/change-requests',
    ...apiChain({
      schemas: { body: changeRequestSchema },
      roles: ['user', 'middleman'],
      enforceIdempotency: true,
      rateLimit: { windowSeconds: 3600, max: 5 },
    }),
    asyncHandler(controller.createChangeRequest),
  );

  router.get(
    '/change-requests',
    ...apiChain({ roles: ['user', 'middleman'] }),
    asyncHandler(controller.listChangeRequests),
  );

  return router;
}
