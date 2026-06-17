import * as sessions from './sessions.service.js';
export async function list(req, res) {
    const data = await sessions.listSessions(req.auth.userId, req.auth?.sessionId ?? null);
    res.status(200).json({ sessions: data });
}
export async function revoke(req, res) {
    await sessions.revokeSession(req.auth.userId, req.params.id);
    res.status(204).end();
}
export async function securityLog(req, res) {
    const data = await sessions.listSecurityEvents(req.auth.userId);
    res.status(200).json({ events: data });
}
//# sourceMappingURL=sessions.controller.js.map