/**
 * Shared platform constants confirmed by requirements.md (glossary + Requirement 18).
 * Scaffold-only: domain logic lives in later tasks.
 */

/** Supported coins (Requirement 18.1). */
export const SUPPORTED_COINS = ['USDT', 'SOL', 'BNB', 'ETH', 'TRX'] as const;

/** Supported networks (Requirement 18.2). */
export const SUPPORTED_NETWORKS = ['ETH', 'BNB', 'TRON', 'SOLANA'] as const;

/** API version prefix (Requirement 44.1). */
export const API_PREFIX = '/api/v1';
