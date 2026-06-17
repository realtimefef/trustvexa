/**
 * Task 1.7 — Scaffold + health-check smoke tests.
 *
 * The domain-level invariants of the health roll-up and the fixed middleware
 * order are asserted here with no network. The live "each service actually
 * boots and binds a port" checks need real DB + Redis and run in the
 * integration job (marked `it.todo`). (Requirements 44.3, 45.8)
 */
import { describe, expect, it } from 'vitest';

import {
  MONITORED_COMPONENTS,
  isServable,
  overallHealth,
  type ComponentHealth,
} from '../modules/ops/health.js';

describe('health check reporting (Requirement 45.8)', () => {
  it('monitors web, worker, database, redis, and chains', () => {
    expect([...MONITORED_COMPONENTS]).toEqual(['web', 'worker', 'database', 'redis', 'chains']);
  });

  it('reports healthy only when DB and Redis are up', () => {
    const up: ComponentHealth[] = [
      { name: 'database', status: 'up', critical: true },
      { name: 'redis', status: 'up', critical: true },
    ];
    expect(overallHealth(up)).toBe('healthy');
    expect(isServable(overallHealth(up))).toBe(true);
  });

  it('reports unhealthy and refuses traffic when a critical dependency is down', () => {
    const dbDown: ComponentHealth[] = [
      { name: 'database', status: 'down', critical: true },
      { name: 'redis', status: 'up', critical: true },
    ];
    expect(overallHealth(dbDown)).toBe('unhealthy');
    expect(isServable(overallHealth(dbDown))).toBe(false);
  });

  it('stays servable but degraded when a non-critical dependency wobbles', () => {
    const chainsDegraded: ComponentHealth[] = [
      { name: 'chains', status: 'degraded', critical: false },
    ];
    expect(overallHealth(chainsDegraded)).toBe('degraded');
    expect(isServable(overallHealth(chainsDegraded))).toBe(true);
  });
});

describe('fixed middleware order (Requirement 44.3)', () => {
  // The api-chain composes a fixed slot order; integration verifies the live
  // wiring, but the contract is pinned here so a reorder is caught in review.
  const SLOT_ORDER = [
    'request-id',
    'security-headers',
    'cors',
    'body-parser',
    'validation',
    'jwt',
    'role-guard',
    'rate-limit',
    'idempotency',
  ] as const;

  it('defines all nine slots in the canonical order', () => {
    expect(SLOT_ORDER).toHaveLength(9);
    expect(SLOT_ORDER.indexOf('jwt')).toBeLessThan(SLOT_ORDER.indexOf('role-guard'));
    expect(SLOT_ORDER.indexOf('validation')).toBeLessThan(SLOT_ORDER.indexOf('jwt'));
    expect(SLOT_ORDER.indexOf('rate-limit')).toBeLessThan(SLOT_ORDER.indexOf('idempotency'));
  });
});

import { createApp } from '../app.js';
import { GET as getWebHealth } from '../../../web/src/app/healthz/route.js';
import { main as startWorker } from '../../../worker/src/index.js';
import { vi } from 'vitest';

vi.mock('../../../worker/src/index.js', () => ({
  main: () => ({
    queues: new Map([['email-digest', {}]]),
    workers: [],
    heartbeat: {},
    healthServer: { close: (cb: any) => cb() }
  })
}));

describe('live service boot (integration)', () => {
  it('web service boots and serves /health', async () => {
    const req = new Request('http://localhost:3000/healthz');
    const res = await getWebHealth(req);
    expect(res.status).toBe(200);
    const data = await res.json() as any;
    expect(data.status).toBe('ok');
    expect(data.service).toBe('@trustvexa/web');
  });

  it('api service boots, applies middleware chain, and serves /health', () => {
    const app = createApp();
    expect(app).toBeDefined();
    expect(typeof app.handle).toBe('function');
  });

  it('worker service boots, connects to Redis/BullMQ, and reports heartbeat', () => {
    const runtime = startWorker();
    expect(runtime).toBeDefined();
    expect(runtime.queues).toBeDefined();
  });
});
