/* eslint-disable */
/**
 * Data-repair migration: advance any deal stuck at SellerHandover /
 * MiddlemanVerified straight to 'Delivered' — now including deals WITH a
 * middleman assigned.
 *
 * Background: the flow changed so the seller's handover is their final action
 * and the deal advances all the way to Delivered immediately (the middleman
 * then finalises Delivered → Complete/release). There is no longer a separate
 * "middleman verifies the handover" holding state. The earlier repair
 * (1700003200000) only moved no-middleman deals; this one moves the rest so
 * deals that handed over under the old behaviour reach the Delivered stage.
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
     WHERE status IN ('SellerHandover', 'MiddlemanVerified');
  `);
};

/** @param {MigrationBuilder} _pgm */
exports.down = (_pgm) => {
  /* Non-reversible data repair. */
};
