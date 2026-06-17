import { Router } from 'express';
import { asyncHandler } from '../../lib/async-handler.js';
import { apiChain } from '../../routes/api-chain.js';
import * as controller from './webhook.controller.js';
import { createWebhookSchema } from './webhook.schemas.js';

export function webhookRouter(): Router {
  const router = Router();

  router.post(
    '/',
    ...apiChain({
      schemas: { body: createWebhookSchema },
      roles: ['user', 'middleman'],
    }),
    asyncHandler(controller.create),
  );

  router.get(
    '/',
    ...apiChain({
      roles: ['user', 'middleman'],
    }),
    asyncHandler(controller.list),
  );

  router.delete(
    '/:id',
    ...apiChain({
      roles: ['user', 'middleman'],
    }),
    asyncHandler(controller.remove),
  );

  return router;
}
