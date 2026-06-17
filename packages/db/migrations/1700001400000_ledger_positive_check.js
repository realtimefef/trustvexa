/* eslint-disable */
/**
 * Migration adding a check constraint to ledger_entries to ensure positive amounts.
 */

exports.shorthands = undefined;

/** @param {import('node-pg-migrate').MigrationBuilder} pgm */
exports.up = (pgm) => {
  pgm.addConstraint('ledger_entries', 'ledger_positive_check', 'CHECK (amount_smallest_unit > 0)');
};

/** @param {import('node-pg-migrate').MigrationBuilder} pgm */
exports.down = (pgm) => {
  pgm.dropConstraint('ledger_entries', 'ledger_positive_check');
};
