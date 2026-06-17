import * as service from './changelog.service.js';
export async function listChangelog(_req, res) {
    const result = await service.listChangelog();
    res.status(200).json({ entries: result });
}
//# sourceMappingURL=changelog.controller.js.map