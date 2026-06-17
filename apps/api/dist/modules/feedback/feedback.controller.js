import { requireUserId } from '../../lib/http-params.js';
import * as service from './feedback.service.js';
export async function submitFeedback(req, res) {
    const userId = requireUserId(req);
    const body = req.body;
    const feedback = await service.submitFeedback(userId, body);
    res.status(201).json({ feedback });
}
//# sourceMappingURL=feedback.controller.js.map