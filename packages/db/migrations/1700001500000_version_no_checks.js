/* eslint-disable */
/**
 * Add non-negative CHECK constraints to optimistic-lock version_no columns.
 *
 * `deals.version_no` and `payout_queue.version_no` are used for optimistic
 * locking. Without a DB-level guard, a rogue UPDATE or manual DB patch could
 * set them to negative values, which would confuse the locking logic.
 * (Audit FIX-P3-4)
 */

exports.shorthands = undefined;

/** @param {import('node-pg-migrate').MigrationBuilder} pgm */
exports.up = (pgm) => {
  pgm.addConstraint('deals', 'deals_version_no_non_negative', 'CHECK (version_no >= 0)');
  pgm.addConstraint(
    'payout_queue',
    'payout_queue_version_no_non_negative',
    'CHECK (version_no >= 0)',
  );
};

/** @param {import('node-pg-migrate').MigrationBuilder} pgm */
exports.down = (pgm) => {
  pgm.dropConstraint('payout_queue', 'payout_queue_version_no_non_negative');
  pgm.dropConstraint('deals', 'deals_version_no_non_negative');
};
