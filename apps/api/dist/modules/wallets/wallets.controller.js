import { requireParam, requireUserId } from '../../lib/http-params.js';
import * as service from './wallets.service.js';
export async function listAddressBook(req, res) {
    const userId = requireUserId(req);
    const result = await service.getAddressBook(userId);
    res.status(200).json({ addresses: result });
}
export async function addAddress(req, res) {
    const userId = requireUserId(req);
    const body = req.body;
    const { entry, existed } = await service.addAddress(userId, body);
    // Idempotent: an existing identical wallet replays as 200, a fresh insert 201.
    res.status(existed ? 200 : 201).json(entry);
}
export async function deleteAddress(req, res) {
    const userId = requireUserId(req);
    const id = requireParam(req, 'id');
    await service.removeAddress(userId, id);
    res.status(204).send();
}
export async function validateAddress(req, res) {
    const userId = requireUserId(req);
    const body = req.body;
    const outcome = await service.validateAddress(userId, body);
    res.status(200).json(outcome);
}
export async function createChangeRequest(req, res) {
    const userId = requireUserId(req);
    const body = req.body;
    const { entry, existed } = await service.createChangeRequest(userId, body);
    res.status(existed ? 200 : 201).json(entry);
}
export async function listChangeRequests(req, res) {
    const userId = requireUserId(req);
    const result = await service.getChangeRequests(userId);
    res.status(200).json({ changeRequests: result });
}
export async function getWalletInfo(req, res) {
    const userId = requireUserId(req);
    const result = await service.getWalletInfo(userId);
    res.status(200).json(result);
}
export async function withdraw(req, res) {
    const userId = requireUserId(req);
    const body = req.body;
    // The withdraw route enforces Idempotency-Key (apiChain enforceIdempotency),
    // so req.idempotencyKey is guaranteed present here.
    const idempotencyKey = req.idempotencyKey ?? '';
    const result = await service.withdraw(userId, body, idempotencyKey);
    res.status(200).json(result);
}
//# sourceMappingURL=wallets.controller.js.map