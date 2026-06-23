/* eslint-disable */
/**
 * Data-repair migration: advance deals stuck at Agreed or Verified to Confirmed.
 *
 * Previously the deal flow required a verification-code exchange (Agreed→Verified)
 * and a terms-acceptance step (Verified→Confirmed). Both steps are now skipped
 * automatically when both parties agree — the deal jumps straight to Confirmed.
 * This repair advances any deals still sitting at Agreed or Verified
 * (with locked_at set, meaning both parties have agreed) to Confirmed so that
 * buyers can fund their escrow immediately.
 *
 * @typedef {import('node-pg-migrate').MigrationBuilder} MigrationBuilder
 */

exports.shorthands = undefined;

/** @param {MigrationBuilder} pgm */
exports.up = (pgm) => {
  pgm.sql(`
    UPDATE deals
       SET status     = 'Confirmed',
           version_no = version_no + 1,
           updated_at = now()
     WHERE locked_at IS NOT NULL
       AND status IN ('Agreed', 'Verified');
  `);
};

/** @param {MigrationBuilder} pgm */
exports.down = (_pgm) => {
  /* Non-reversible data repair — the original per-row status is unknown. */
};
