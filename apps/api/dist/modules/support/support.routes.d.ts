/**
 * Support-tickets router (Build Spec §3 "Support / misc"), intended mount path
 * `/api/v1/support`.
 *
 * User routes — callers read/write their own tickets only:
 *   POST /tickets              — create (Idempotency-Key required)
 *   GET  /tickets              — list caller's tickets
 *   GET  /tickets/:id          — get one of caller's tickets
 *
 * Middleman routes — full ticket management console:
 *   GET  /admin/tickets        — list ALL tickets (filters: status, priority, category)
 *   GET  /admin/tickets/:id    — get any ticket + replies
 *   POST /admin/tickets/:id/reply  — reply and optionally update status
 *   PATCH /admin/tickets/:id/status — update status only
 */
import { Router } from 'express';
export declare function supportRouter(): Router;
//# sourceMappingURL=support.routes.d.ts.map