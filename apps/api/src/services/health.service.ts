import type { DependencyStatus as ConnectivityDependency } from '@trustvexa/shared/health';

import { HealthRepository, type DependencyStatus } from '../repositories/health.repository.js';

/**
 * Health service (business layer).
 *
 * Sits between controllers and repositories per the layered architecture. It
 * exposes two probes:
 *   - `ping()` — a cheap liveness payload proving the wiring works.
 *   - `healthz()` — a real readiness check that pings PostgreSQL + Redis and
 *     reports an aggregate `ok`/`degraded` status (Requirement 45.8).
 */
export interface PingResult {
  readonly status: 'ok';
  readonly service: string;
  readonly dependencies: DependencyStatus[];
}

export interface HealthzResult {
  readonly status: 'ok' | 'degraded';
  readonly service: string;
  readonly dependencies: ConnectivityDependency[];
}

export class HealthService {
  constructor(private readonly repository: HealthRepository = new HealthRepository()) {}

  ping(): PingResult {
    return {
      status: 'ok',
      service: '@trustvexa/api',
      dependencies: this.repository.checkDependencies(),
    };
  }

  async healthz(): Promise<HealthzResult> {
    const { status, dependencies } = await this.repository.checkConnectivity();
    return { status, service: '@trustvexa/api', dependencies };
  }
}
