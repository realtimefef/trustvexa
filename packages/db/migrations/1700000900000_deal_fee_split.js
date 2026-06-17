/* eslint-disable */
/**
 * Deal fee-split column migration.
 *
 * Adds `deals.fee_split_buyer_bps`: the buyer's agreed share of the platform
 * fee for `split` deals, in basis points (0–10,000). Defaults to 5,000 (an even
 * 50/50 split) so existing rows keep their previous behaviour. The seller's
 * share is always the exact remainder, so no cent is created or lost.
 * The split is per-deal and agreed by buyer and seller — never forced to 50/50.
 * *(Requirement 15.5)*
 *
 * @typedef {import('node-pg-migrate').MigrationBuilder} MigrationBuilder
 */

exports.shorthands = undefined;

/** @param {MigrationBuilder} pgm */
exports.up = (pgm) => {
  pgm.addColumn('deals', {
    fee_split_buyer_bps: {
      type: 'integer',
      notNull: false,
      default: 5000,
    },
  });
  // Enforce the valid basis-point range at the database level.
  pgm.addConstraint('deals', 'deals_fee_split_buyer_bps_range', {
    check:
      'fee_split_buyer_bps IS NULL OR (fee_split_buyer_bps >= 0 AND fee_split_buyer_bps <= 10000)',
  });
};

/** @param {MigrationBuilder} pgm */
exports.down = (pgm) => {
  pgm.dropConstraint('deals', 'deals_fee_split_buyer_bps_range');
  pgm.dropColumn('deals', 'fee_split_buyer_bps');
};
