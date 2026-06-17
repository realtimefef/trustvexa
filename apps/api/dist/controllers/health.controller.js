import { HealthService } from '../services/health.service.js';
/**
 * Health controller (HTTP layer).
 *
 * Maps the HTTP request/response shape onto the service. Controllers never
 * contain business or money logic — that lives in services. (Design: backend
 * layered architecture)
 */
export class HealthController {
    service;
    constructor(service = new HealthService()) {
        this.service = service;
    }
    ping = (req, res) => {
        const result = this.service.ping();
        res.status(200).json({ ...result, request_id: req.requestId });
    };
    /**
     * `/healthz` readiness probe. Reports per-dependency PostgreSQL + Redis
     * status and returns 200 when healthy, 503 when any dependency is down so
     * Render (and other orchestrators) can gate traffic. Never throws — a downed
     * dependency is reported, not raised. (Requirement 45.8)
     */
    healthz = async (req, res) => {
        const result = await this.service.healthz();
        const statusCode = result.status === 'ok' ? 200 : 503;
        res.status(statusCode).json({ ...result, request_id: req.requestId });
    };
}
//# sourceMappingURL=health.controller.js.map