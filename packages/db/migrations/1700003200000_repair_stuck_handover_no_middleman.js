/* eslint-disable */
/**
 * Data-repair migration: advance deals stuck at SellerHandover / MiddlemanVerified
 * that have NO middleman assigned, straight to 'Delivered'.
 *
 * Background: SellerHandover → MiddlemanVerified → Delivered are normally driven
 * by the assigned middleman. Deals created without a middleman therefore got
 * stuck at SellerHandover once the seller submitted the handover (nobody could
 * verify/deliver). New deals are now auto-advanced in sellerHandover(), but
 * deals that handed over before that fix remain stuck. This advances them so the
 * buyer reaches the Delivered/inspection stage and can approve.
 *
 * @typedef {import('node-pg-migrate').MigrationBuilder} MigrationBuilder
 */

exports.shorthands = undefined;

/** @param {MigrationBuilder} pgm */
exports.up = (pgm) => {
  pgm.sql(`
    UPDATE deals
       SET status     = 'Delivered',
           version_no = version_no + 1,
           updated_at = now()
     WHERE middleman_id IS NULL
       AND status IN ('SellerHandover', 'MiddlemanVerified');
  `);
};

/** @param {MigrationBuilder} _pgm */
exports.down = (_pgm) => {
  /* Non-reversible data repair. */
};
