import * as service from './status.service.js';
export async function getStatus(_req, res) {
    const result = await service.getPlatformStatus();
    res.status(200).json(result);
}
//# sourceMappingURL=status.controller.js.map