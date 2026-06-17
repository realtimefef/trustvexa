import { randomUUID } from 'node:crypto';

import type { RequestHandler } from 'express';
import { pinoHttp } from 'pino-http';

import { logger } from '../logger.js';

// SEC-HIGH-7 FIX: Validate the incoming header as a UUID before accepting it.
// An unvalidated header value injected into every log line enables log-injection
// attacks. Only well-formed UUIDs are accepted; anything else gets a fresh one.
const REQUEST_ID_UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const REQUEST_ID_HEADER = 'x-request-id';

export function requestContext(): RequestHandler {
  return pinoHttp({
    logger,
    genReqId(req, res) {
      const existing = req.headers[REQUEST_ID_HEADER];
      const raw = typeof existing === 'string' ? existing.trim() : '';
      // Only accept well-formed UUIDs to prevent log injection.
      const id = REQUEST_ID_UUID_RE.test(raw) ? raw : randomUUID();
      (req as unknown as { requestId: string }).requestId = id;
      res.setHeader('X-Request-Id', id);
      return id;
    },
    customProps(req) {
      return { request_id: (req as unknown as { requestId?: string }).requestId };
    },
  });
}
