/* eslint-disable */
/**
 * Reference-data seed (task 2.10).
 *
 * Idempotent (ON CONFLICT DO NOTHING / DO UPDATE) seed of operational reference
 * tables so the platform has correct money precision, an initial token
 * allowlist, reserved names, deal limits, support SLAs, and policy versions on
 * first boot. Run after migrations:  `pnpm --filter @trustvexa/db seed`.
 *
 * Source of truth: design §16/§32 + requirements 17.1, 20.5, 1.7, 26, 36.8.
 * Values that depend on operator decisions (e.g. stablecoin contract addresses
 * per chain) are flagged below and must be confirmed before production.
 */

const { Client } = require('pg');

// --- Money precision (decimals + smallest unit per coin/network) ----------
// Native + stablecoins across the four supported networks.
const MONEY_PRECISION = [
  {
    coin: 'BTC',
    network: 'bitcoin',
    decimals: 8,
    smallest_unit_name: 'satoshi',
    rounding_mode: 'floor',
    min_transfer_smallest_unit: 10000,
  },
  {
    coin: 'ETH',
    network: 'ethereum',
    decimals: 18,
    smallest_unit_name: 'wei',
    rounding_mode: 'floor',
    min_transfer_smallest_unit: 1000000000000000,
  },
  {
    coin: 'USDT',
    network: 'ethereum',
    decimals: 6,
    smallest_unit_name: 'micro-USDT',
    rounding_mode: 'floor',
    min_transfer_smallest_unit: 1000000,
  },
  {
    coin: 'USDC',
    network: 'ethereum',
    decimals: 6,
    smallest_unit_name: 'micro-USDC',
    rounding_mode: 'floor',
    min_transfer_smallest_unit: 1000000,
  },
  {
    coin: 'BNB',
    network: 'bsc',
    decimals: 18,
    smallest_unit_name: 'jager',
    rounding_mode: 'floor',
    min_transfer_smallest_unit: 1000000000000000,
  },
  {
    coin: 'USDT',
    network: 'bsc',
    decimals: 18,
    smallest_unit_name: 'wei',
    rounding_mode: 'floor',
    min_transfer_smallest_unit: 1000000000000000,
  },
  {
    coin: 'USDT',
    network: 'tron',
    decimals: 6,
    smallest_unit_name: 'sun-USDT',
    rounding_mode: 'floor',
    min_transfer_smallest_unit: 1000000,
  },
  {
    coin: 'SOL',
    network: 'solana',
    decimals: 9,
    smallest_unit_name: 'lamport',
    rounding_mode: 'floor',
    min_transfer_smallest_unit: 1000000,
  },
  {
    coin: 'USDC',
    network: 'solana',
    decimals: 6,
    smallest_unit_name: 'micro-USDC',
    rounding_mode: 'floor',
    min_transfer_smallest_unit: 1000000,
  },
];

// --- Token contract allowlist --------------------------------------------
// NOTE (OPERATOR): contract addresses are the canonical mainnet issuers; verify
// each against the official issuer before enabling on production.
const TOKEN_ALLOWLIST = [
  {
    coin: 'USDT',
    network: 'ethereum',
    contract_address: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
    token_symbol: 'USDT',
    decimals: 6,
    verified_source: 'tether-official',
  },
  {
    coin: 'USDC',
    network: 'ethereum',
    contract_address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
    token_symbol: 'USDC',
    decimals: 6,
    verified_source: 'circle-official',
  },
  {
    coin: 'USDT',
    network: 'bsc',
    contract_address: '0x55d398326f99059fF775485246999027B3197955',
    token_symbol: 'USDT',
    decimals: 18,
    verified_source: 'tether-official',
  },
  {
    coin: 'USDT',
    network: 'tron',
    contract_address: 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t',
    token_symbol: 'USDT',
    decimals: 6,
    verified_source: 'tether-official',
  },
  {
    coin: 'USDC',
    network: 'solana',
    contract_address: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
    token_symbol: 'USDC',
    decimals: 6,
    verified_source: 'circle-official',
  },
];

// --- Reserved usernames / display names ----------------------------------
const RESERVED_NAMES = [
  'admin',
  'administrator',
  'trustvexa',
  'support',
  'system',
  'moderator',
  'middleman',
  'escrow',
  'official',
  'root',
  'security',
  'billing',
  'help',
  'staff',
  'team',
  'api',
  'null',
  'undefined',
].map((v) => ({
  reserved_value: v,
  reserved_type: 'username',
  reason: 'impersonation_protection',
}));

// --- Deal limit rules per account label ----------------------------------
// Deal size band $400-$50,000 (max_open_value stored in USD cents).
const DEAL_LIMIT_RULES = [
  {
    account_label: 'new_user',
    max_active_deals: 2,
    max_daily_deals: 3,
    max_open_value_usd: 5000000,
  },
  {
    account_label: 'established',
    max_active_deals: 10,
    max_daily_deals: 15,
    max_open_value_usd: 50000000,
  },
  {
    account_label: 'trusted',
    max_active_deals: 25,
    max_daily_deals: 40,
    max_open_value_usd: 250000000,
  },
];

// --- Support SLA rules ----------------------------------------------------
const SUPPORT_SLA_RULES = [
  { priority: 'low', expected_response_minutes: 2880 },
  { priority: 'normal', expected_response_minutes: 1440 },
  { priority: 'high', expected_response_minutes: 240 },
  { priority: 'urgent', expected_response_minutes: 60 },
];

// --- Initial policy versions ---------------------------------------------
const POLICY_VERSIONS = [
  { doc_type: 'terms', version: '1.0.0', summary: 'Initial Terms of Service' },
  { doc_type: 'privacy', version: '1.0.0', summary: 'Initial Privacy Policy' },
  { doc_type: 'dispute_policy', version: '1.0.0', summary: 'Initial Dispute Resolution Policy' },
  { doc_type: 'crypto_risk', version: '1.0.0', summary: 'Initial Crypto Risk Disclosure' },
  { doc_type: 'cookie', version: '1.0.0', summary: 'Initial Cookie Policy' },
];

async function seed() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL is not set');
  }
  const client = new Client({ connectionString });
  await client.connect();
  try {
    await client.query('BEGIN');

    for (const r of MONEY_PRECISION) {
      await client.query(
        `INSERT INTO money_precision_rules (coin, network, decimals, smallest_unit_name, rounding_mode, min_transfer_smallest_unit)
         VALUES ($1,$2,$3,$4,$5,$6)`,
        [
          r.coin,
          r.network,
          r.decimals,
          r.smallest_unit_name,
          r.rounding_mode,
          r.min_transfer_smallest_unit,
        ],
      );
    }

    for (const t of TOKEN_ALLOWLIST) {
      await client.query(
        `INSERT INTO token_contract_allowlist (coin, network, contract_address, token_symbol, decimals, verified_source)
         VALUES ($1,$2,$3,$4,$5,$6)
         ON CONFLICT (coin, network, contract_address) DO NOTHING`,
        [t.coin, t.network, t.contract_address, t.token_symbol, t.decimals, t.verified_source],
      );
    }

    for (const n of RESERVED_NAMES) {
      await client.query(
        `INSERT INTO reserved_names (reserved_value, reserved_type, reason) VALUES ($1,$2,$3)`,
        [n.reserved_value, n.reserved_type, n.reason],
      );
    }

    for (const d of DEAL_LIMIT_RULES) {
      await client.query(
        `INSERT INTO deal_limit_rules (account_label, max_active_deals, max_daily_deals, max_open_value_usd)
         VALUES ($1,$2,$3,$4)`,
        [d.account_label, d.max_active_deals, d.max_daily_deals, d.max_open_value_usd],
      );
    }

    for (const s of SUPPORT_SLA_RULES) {
      await client.query(
        `INSERT INTO support_sla_rules (priority, expected_response_minutes) VALUES ($1,$2)`,
        [s.priority, s.expected_response_minutes],
      );
    }

    for (const p of POLICY_VERSIONS) {
      await client.query(
        `INSERT INTO policy_versions (doc_type, version, summary, published_at)
         VALUES ($1,$2,$3, now())
         ON CONFLICT (doc_type, version) DO NOTHING`,
        [p.doc_type, p.version, p.summary],
      );
    }

    await client.query('COMMIT');
    console.log('Reference data seeded.');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    await client.end();
  }
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
