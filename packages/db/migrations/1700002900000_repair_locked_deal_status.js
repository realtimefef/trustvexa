/* eslint-disable */
/**
 * Data-repair migration: advance deals that were locked (both parties agreed,
 * locked_at is set) but whose status was never advanced from Created/Invited to
 * Agreed. This happened because the original agree service called
 * applyDealTransition() post-commit in a silent catch — the lock was written but
 * the status update was silently swallowed.
 *
 * Fix: UPDATE status → Agreed for any deal where:
 *   - locked_at IS NOT NULL        (deal was locked by both parties)
 *   - buyer_agreed_at IS NOT NULL  (buyer agreed)
 *   - seller_agreed_at IS NOT NULL (seller agreed)
 *   - status IN ('Created','Invited') (status was never advanced)
 *
 * @typedef {import('node-pg-migrate').MigrationBuilder} MigrationBuilder
 */

exports.shorthands = undefined;

/** @param {MigrationBuilder} pgm */
exports.up = (pgm) => {
  pgm.sql(`
    UPDATE deals
       SET status     = 'Agreed',
           version_no = version_no + 1,
           updated_at = now()
     WHERE locked_at         IS NOT NULL
       AND buyer_agreed_at   IS NOT NULL
       AND seller_agreed_at  IS NOT NULL
       AND status IN ('Created', 'Invited');
  `);
};

/** @param {MigrationBuilder} pgm */
exports.down = (pgm) => {
  /* Intentionally a no-op — we cannot safely revert a data-repair without
     knowing the original per-row status value. The repair is safe to leave. */
};
