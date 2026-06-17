import * as account from './account.service.js';
export async function deactivate(req, res) {
    const body = req.body;
    await account.deactivate(req.auth.userId, body.password, body.reason ?? null);
    res.status(200).json({ ok: true, account_status: 'deactivated' });
}
export async function reactivate(req, res) {
    await account.reactivate(req.auth.userId);
    res.status(200).json({ ok: true, account_status: 'active' });
}
export async function requestDeletion(req, res) {
    const body = req.body;
    const result = await account.requestDeletion(req.auth.userId, body.password, body.reason ?? null);
    res.status(result.status === 'completed' ? 200 : 202).json({
        ok: true,
        status: result.status,
        active_deal_count: result.activeDealCount,
    });
}
//# sourceMappingURL=account.controller.js.map