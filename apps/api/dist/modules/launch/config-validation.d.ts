export interface EnvSpec {
    key: string;
    /** Required for real-money (mainnet) operation. */
    requiredForMainnet: boolean;
    description: string;
    /**
     * Tier of the requirement for mainnet:
     *  - 'critical'    : fund-safety / core operation. Missing => REFUSE to boot.
     *  - 'recommended' : feature service (email, uploads, social login). Missing
     *                    => boot with a warning; the feature degrades until set.
     * Only meaningful when `requiredForMainnet` is true.
     */
    tier?: 'critical' | 'recommended';
}
export declare const ENV_SPECS: readonly EnvSpec[];
export interface ConfigValidationResult {
    ok: boolean;
    /** Critical keys that are missing — these block boot. */
    missing: string[];
    /** Recommended keys that are missing — these only warn. */
    missingRecommended: string[];
}
/**
 * Validate the environment. When `forMainnet` is true, every mainnet key is
 * checked, but only missing `critical`-tier keys make `ok` false (boot-block).
 * Missing `recommended`-tier keys are reported separately for a warning so a
 * real deployment is not held hostage by an optional feature service.
 */
export declare function validateConfig(env: Readonly<Record<string, string | undefined>>, forMainnet: boolean): ConfigValidationResult;
export declare function assertRuntimeConfig(env?: Readonly<Record<string, string | undefined>>): void;
//# sourceMappingURL=config-validation.d.ts.map