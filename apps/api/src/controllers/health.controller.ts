import type { Request, Response } from 'express';

import { HealthService } from '../services/health.service.js';

/**
 * Health controller (HTTP layer).
 *
 * Maps the HTTP request/response shape onto the service. Controllers never
 * contain business or money logic — that lives in services. (Design: backend
 * layered architecture)
 */
export class HealthController {
  constructor(private readonly service: HealthService = new HealthService()) {}

  ping = (req: Request, res: Response): void => {
    const result = this.service.ping();
    res.status(200).json({ ...result, request_id: req.requestId });
  };

  /**
   * `/healthz` readiness probe. Reports per-dependency PostgreSQL + Redis
   * status and returns 200 when healthy, 503 when any dependency is down so
   * Render (and other orchestrators) can gate traffic. Never throws — a downed
   * dependency is reported, not raised. (Requirement 45.8)
   */
  healthz = async (req: Request, res: Response): Promise<void> => {
    const result = await this.service.healthz();
    const statusCode = result.status === 'ok' ? 200 : 503;
    res.status(statusCode).json({ ...result, request_id: req.requestId });
  };
}
