import * as consentService from './consent.service.js';
export async function recordConsent(req, res) {
    const userId = req.auth?.userId ?? null;
    const result = await consentService.recordCookieConsent(userId, req.body);
    res.status(201).json({
        id: result.id,
        consented_at: result.consentedAt,
    });
}
//# sourceMappingURL=consent.controller.js.map