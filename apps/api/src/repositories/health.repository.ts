import { checkConnectivity, type ConnectivityResult } from '@trustvexa/shared/health';

/**
 * Health repository (data-access layer).
 *
 * Bottom layer of `routes/controllers -> services -> repositories`. The
 * lightweight `/health/ping` liveness probe reports dependencies as
 * `unchecked`, while `/healthz` performs real PostgreSQL + Redis connectivity
 * probes via the shared lazy clients (task 1.5, Requirement 45.8). The shared
 * probes never throw and never hang, so this layer stays safe to call even when
 * a dependency is down.
 */
export interface DependencyStatus {
  readonly name: string;
  readonly status: 'ok' | 'unchecked';
}

export class HealthRepository {
  /**
   * Lightweight liveness used by `/health/ping`: reports the dependency list
   * without performing I/O.
   */
  checkDependencies(): DependencyStatus[] {
    return [
      { name: 'postgres', status: 'unchecked' },
      { name: 'redis', status: 'unchecked' },
    ];
  }

  /**
   * Real connectivity probe used by `/healthz`: pings PostgreSQL and Redis via
   * the shared lazy clients. Resolves with per-dependency status (never throws).
   */
  async checkConnectivity(): Promise<ConnectivityResult> {
    return checkConnectivity();
  }
}
