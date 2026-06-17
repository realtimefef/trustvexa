import * as service from './treasury.service.js';
export async function getTreasury(_req, res) {
    const result = await service.getTreasury();
    res.status(200).json(result);
}
//# sourceMappingURL=treasury.controller.js.map