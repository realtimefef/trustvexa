/* eslint-disable */
/**
 * Add a partial unique index on user_payout_addresses(user_id, coin, network)
 * to prevent multiple active payout addresses per coin/network per user.
 *
 * Without this constraint multiple rows can exist for the same user+coin+network,
 * which creates a payout ambiguity: `getWalletInfo` would return all of them and
 * it would be unclear which one receives the payout. The wallet-change request
 * flow (24h hold) implies a single active address at a time.
 *
 * We use a partial unique index (WHERE is_primary = true) to allow a user to
 * keep historical addresses (is_primary = false) while guaranteeing exactly one
 * primary address per coin/network. The `is_primary` column is added here first.
 * (Audit FIX-P2-4)
 */

exports.shorthands = undefined;

/** @param {import('node-pg-migrate').MigrationBuilder} pgm */
exports.up = (pgm) => {
  // Add is_primary column; existing rows default to false so the unique
  // constraint is satisfied without migrating data.
  pgm.addColumn('user_payout_addresses', {
    is_primary: { type: 'boolean', notNull: true, default: false },
  });

  // Partial unique index: only one primary address per (user, coin, network).
  pgm.createIndex(
    'user_payout_addresses',
    ['user_id', 'coin', 'network'],
    {
      unique: true,
      where: 'is_primary = true',
      name: 'user_payout_addresses_primary_unique',
    },
  );
};

/** @param {import('node-pg-migrate').MigrationBuilder} pgm */
exports.down = (pgm) => {
  pgm.dropIndex('user_payout_addresses', ['user_id', 'coin', 'network'], {
    name: 'user_payout_addresses_primary_unique',
  });
  pgm.dropColumn('user_payout_addresses', 'is_primary');
};
