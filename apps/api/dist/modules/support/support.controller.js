/**
 * Support-tickets HTTP controllers (Build Spec §3 "Support / misc").
 *
 * Thin HTTP <-> service translation. The owner is always derived from the
 * verified JWT (`requireUserId`), never from the request body. The idempotency
 * key (guaranteed present by the api chain on the create route) is used as the
 * ticket's `request_id` so safe retries do not create duplicates.
 */
import { randomUUID } from 'node:crypto';
import { requireParam, requireUserId } from '../../lib/http-params.js';
import * as service from './support.service.js';
export async function createTicket(req, res) {
    const userId = requireUserId(req);
    // The api chain enforces an Idempotency-Key on this route; fall back to a
    // generated id defensively so `request_id` is always populated.
    const requestId = req.idempotencyKey ?? randomUUID();
    const result = await service.createTicket(userId, requestId, req.body);
    res.status(201).json(result);
}
export async function listTickets(req, res) {
    const userId = requireUserId(req);
    const result = await service.listTickets(userId);
    res.status(200).json({ tickets: result });
}
export async function getTicket(req, res) {
    const userId = requireUserId(req);
    const id = requireParam(req, 'id');
    const result = await service.getTicket(userId, id);
    res.status(200).json(result);
}
//# sourceMappingURL=support.controller.js.map