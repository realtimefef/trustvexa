/**
 * Pure wallet-address format validation (no I/O, no DB).
 *
 * Validates a crypto address string against the coin/network it is meant to
 * settle on. The platform pins each coin to the chains it can use (see
 * `COIN_NETWORK_SUPPORT` in `../deal/deal.schemas.ts`), so validation is a
 * two-step check:
 *
 *   1. coin <-> network pairing is supported (otherwise `mismatch`), and
 *   2. the address matches the address shape for that network (otherwise
 *      `invalid`).
 *
 * No existing address-format helper was found under `modules/money` or
 * `packages/shared`, so this small validator is implemented here and kept pure
 * (Requirement: wallet address validation).
 */
import { type SupportedCoin, type SupportedNetwork } from '../deal/deal.schemas.js';
/** Outcome of a wallet-address validation check (matches the DB `result` set). */
export type ValidationResult = 'valid' | 'invalid' | 'mismatch' | 'risky';
export interface ValidationOutcome {
    result: ValidationResult;
    message: string;
}
/**
 * Validate an address against a coin/network pair. Pure and synchronous: the
 * service layer is responsible for persisting any check result.
 */
export declare function validateWalletAddress(coin: SupportedCoin, network: SupportedNetwork, address: string): ValidationOutcome;
//# sourceMappingURL=address-validation.d.ts.map