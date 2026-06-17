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
import { COIN_NETWORK_SUPPORT, isCoinNetworkSupported, } from '../deal/deal.schemas.js';
/** EVM-style address (Ethereum / BNB Smart Chain — ERC-20 / BEP-20). */
const EVM_ADDRESS = /^0x[0-9a-fA-F]{40}$/;
/** TRON (TRC-20) base58 address: leading `T` + 33 base58 chars. */
const TRON_ADDRESS = /^T[1-9A-HJ-NP-Za-km-z]{33}$/;
/** Solana (SPL) base58 public key: 32–44 base58 chars. */
const SOLANA_ADDRESS = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
/** True when `address` has a valid format for the given network. */
function matchesNetworkFormat(network, address) {
    switch (network) {
        case 'ETH':
        case 'BNB':
            return EVM_ADDRESS.test(address);
        case 'TRON':
            return TRON_ADDRESS.test(address);
        case 'SOLANA':
            return SOLANA_ADDRESS.test(address);
        default: {
            // Exhaustiveness guard: a new network must be handled explicitly.
            const _never = network;
            return _never;
        }
    }
}
/**
 * Validate an address against a coin/network pair. Pure and synchronous: the
 * service layer is responsible for persisting any check result.
 */
export function validateWalletAddress(coin, network, address) {
    const trimmed = address.trim();
    if (trimmed === '') {
        return { result: 'invalid', message: 'Address must not be empty.' };
    }
    if (!isCoinNetworkSupported(coin, network)) {
        const allowed = COIN_NETWORK_SUPPORT[coin].join(', ');
        return {
            result: 'mismatch',
            message: `${coin} cannot settle on ${network}. Supported networks for ${coin}: ${allowed}.`,
        };
    }
    if (!matchesNetworkFormat(network, trimmed)) {
        return {
            result: 'invalid',
            message: `Address is not a valid ${network} address.`,
        };
    }
    return { result: 'valid', message: 'Address is valid for the selected coin and network.' };
}
//# sourceMappingURL=address-validation.js.map