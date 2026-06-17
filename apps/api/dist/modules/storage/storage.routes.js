import { Router } from 'express';
import { asyncHandler } from '../../lib/async-handler.js';
import { apiChain } from '../../routes/api-chain.js';
import * as controller from './storage.controller.js';
export function storageRouter() {
    const router = Router();
    router.post('/upload', ...apiChain({
        roles: ['user', 'middleman'],
        rateLimit: { windowSeconds: 3600, max: 20 },
    }), asyncHandler(controller.uploadFile));
    router.get('/files/:fileId/view', ...apiChain(), asyncHandler(controller.viewFile));
    // Serve a connection-chat image directly by file_key (JWT auth only, no attachment row needed).
    router.get('/serve/:fileKey(*)', ...apiChain({ roles: ['user', 'middleman'] }), asyncHandler(controller.serveFile));
    return router;
}
//# sourceMappingURL=storage.routes.js.map