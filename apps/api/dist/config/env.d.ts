/**
 * Environment configuration for the API service.
 *
 * Scaffold-only: only the values needed to boot the HTTP server and the
 * middleware stack are read here. Secrets for JWT, DB, and Redis are wired in
 * later tasks (3.x, 1.5) and documented in the root `.env.example`.
 */
export interface ApiConfig {
    readonly nodeEnv: string;
    readonly port: number;
    readonly corsOrigins: string[];
    readonly isProduction: boolean;
}
export declare function loadConfig(): ApiConfig;
export declare const config: ApiConfig;
//# sourceMappingURL=env.d.ts.map