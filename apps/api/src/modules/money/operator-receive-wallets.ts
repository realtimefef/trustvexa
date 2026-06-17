/**
 * Operator receive (escrow deposit) wallet addresses.
 *
 * These are the platform-operator-controlled addresses that buyers send escrow
 * deposits to. Each value is overridable by an environment variable so the
 * committed defaults can be rotated without a code change in production.
 *
 * IMPORTANT OPERATIONAL NOTES:
 *  - The escrow design in `escrow_addresses` is per-deal (one row per deal).
 *    Using a single shared address per chain means the deposit watcher cannot
 *    distinguish two concurrent deals on the same chain by address alone; it
 *    must fall back to the exact-amount match. Keep this in mind operationally
 *    (prefer unique deal amounts, or move to HD-derived per-deal addresses).
 *  - The operator MUST control the private keys for every address below.
 *    Receiving works with the public address; PAYOUTS additionally require the
 *    signing keys to be wired into the payout worker.
 *  - BTC and USDC are intentionally absent: the platform's supported coin list
 *    (SUPPORTED_COINS) is USDT, SOL, BNB, ETH, TRX. Add the coin/network to the
 *    allow-list first before configuring a receive address for it.
 */
import { isValidAddress, type Network } from './escrow-address.js';
import type { SupportedCoin, SupportedNetwork } from '../deal/deal.schemas.js';

/** A configured operator receive address for one coin/network pair. */
interface ReceiveWalletDef {
  coin: SupportedCoin;
  network: SupportedNetwork;
  /** Environment variable that overrides the committed default. */
  envKey: string;
  /** Committed default (operator-provided). */
  defaultAddress: string;
}

/**
 * Operator-provided receive addresses (saved 2026-06). EVM chains (ETH, BNB and
 * their tokens) share one EVM address; TRON-side assets share the TRON address;
 * Solana-side assets share the Solana address — this is correct because a token
 * is received at the chain account that owns it.
 */
const EVM_RECEIVE = '0x4563be12c94693Ee1Fd7f3eC14F774A0a5d94976';
const TRON_RECEIVE = 'TX6RThThj1tFuPePiNyeffHnGezHxVLoiq';
const SOLANA_RECEIVE = 'BBMt146429Y7hBNKXDbdWAxp4N1LKbQUCTVb1okC6Q9e';

const RECEIVE_WALLET_DEFS: readonly ReceiveWalletDef[] = [
  { coin: 'ETH', network: 'ETH', envKey: 'RECEIVE_ADDRESS_ETH_ETH', defaultAddress: EVM_RECEIVE },
  { coin: 'BNB', network: 'BNB', envKey: 'RECEIVE_ADDRESS_BNB_BNB', defaultAddress: EVM_RECEIVE },
  { coin: 'SOL', network: 'SOLANA', envKey: 'RECEIVE_ADDRESS_SOL_SOLANA', defaultAddress: SOLANA_RECEIVE },
  { coin: 'TRX', network: 'TRON', envKey: 'RECEIVE_ADDRESS_TRX_TRON', defaultAddress: TRON_RECEIVE },
  { coin: 'USDT', network: 'ETH', envKey: 'RECEIVE_ADDRESS_USDT_ETH', defaultAddress: EVM_RECEIVE },
  { coin: 'USDT', network: 'BNB', envKey: 'RECEIVE_ADDRESS_USDT_BNB', defaultAddress: EVM_RECEIVE },
  { coin: 'USDT', network: 'TRON', envKey: 'RECEIVE_ADDRESS_USDT_TRON', defaultAddress: TRON_RECEIVE },
  { coin: 'USDT', network: 'SOLANA', envKey: 'RECEIVE_ADDRESS_USDT_SOLANA', defaultAddress: SOLANA_RECEIVE },
];

function keyOf(coin: string, network: string): string {
  return `${coin}:${network}`;
}

/** Resolve the configured receive address for a coin/network (env overrides default). */
export function getOperatorReceiveAddress(
  coin: SupportedCoin,
  network: SupportedNetwork,
): string | null {
  const def = RECEIVE_WALLET_DEFS.find((d) => d.coin === coin && d.network === network);
  if (!def) return null;
  const fromEnv = process.env[def.envKey]?.trim();
  return fromEnv && fromEnv.length > 0 ? fromEnv : def.defaultAddress;
}

/**
 * Validate every configured receive address against its network's format.
 * Returns the list of invalid entries (empty when all are well-formed). Call
 * this at startup so a malformed operator address fails fast instead of being
 * shown to a buyer.
 */
export function validateOperatorReceiveWallets(): Array<{ pair: string; address: string }> {
  const invalid: Array<{ pair: string; address: string }> = [];
  for (const def of RECEIVE_WALLET_DEFS) {
    const address = getOperatorReceiveAddress(def.coin, def.network) ?? '';
    if (!isValidAddress(def.network as Network, address)) {
      invalid.push({ pair: keyOf(def.coin, def.network), address });
    }
  }
  return invalid;
}

/** All configured pairs (for diagnostics / admin display). */
export function listOperatorReceiveWallets(): Array<{
  coin: SupportedCoin;
  network: SupportedNetwork;
  address: string;
}> {
  return RECEIVE_WALLET_DEFS.map((d) => ({
    coin: d.coin,
    network: d.network,
    address: getOperatorReceiveAddress(d.coin, d.network) ?? '',
  }));
}
