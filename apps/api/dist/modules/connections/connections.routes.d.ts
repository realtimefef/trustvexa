/**
 * Connections feature router, mounted at `/api/v1/connections`.
 *
 *   POST /connections              — create a connection (returns join code)
 *   POST /connections/join         — join a connection by code
 *   GET  /connections              — list the caller's connections
 *   GET  /connections/:id          — get one connection (participants only)
 *   GET  /connections/:id/messages — list messages
 *   POST /connections/:id/messages — post a message
 *
 * All routes require a signed-in account; participant access is enforced in the
 * service.
 */
import { Router } from 'express';
export declare function connectionsRouter(): Router;
//# sourceMappingURL=connections.routes.d.ts.map