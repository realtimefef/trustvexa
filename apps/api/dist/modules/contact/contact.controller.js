import * as contactService from './contact.service.js';
export async function submit(req, res) {
    const result = await contactService.submitContactMessage(req.body);
    res.status(201).json({
        id: result.id,
        status: result.status,
        created_at: result.createdAt,
    });
}
//# sourceMappingURL=contact.controller.js.map