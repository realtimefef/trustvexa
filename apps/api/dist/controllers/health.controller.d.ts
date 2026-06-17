import type { Request, Response } from 'express';
import { HealthService } from '../services/health.service.js';
/**
 * Health controller (HTTP layer).
 *
 * Maps the HTTP request/response shape onto the service. Controllers never
 * contain business or money logic — that lives in services. (Design: backend
 * layered architecture)
 */
export declare class HealthController {
    private readonly service;
    constructor(service?: HealthService);
    ping: (req: Request, res: Response) => void;
    /**
     * `/healthz` readiness probe. Reports per-dependency PostgreSQL + Redis
     * status and returns 200 when healthy, 503 when any dependency is down so
     * Render (and other orchestrators) can gate traffic. Never throws — a downed
     * dependency is reported, not raised. (Requirement 45.8)
     */
    healthz: (req: Request, res: Response) => Promise<void>;
}
//# sourceMappingURL=health.controller.d.ts.map