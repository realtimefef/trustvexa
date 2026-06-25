/* eslint-disable */
/**
 * Independent per-side submission flags.
 *
 * After both parties agree (deal locked + funded), the buyer and the seller
 * each submit their final details to the middleman INDEPENDENTLY. Neither
 * submission changes the shared escrow status or affects the other side — they
 * are recorded as two separate timestamps. The middleman completes the deal
 * (release) only after reviewing; completion is the operator's action, not a
 * side effect of either side submitting.
 *
 * @typedef {import('node-pg-migrate').MigrationBuilder} MigrationBuilder
 */

exports.shorthands = undefined;

/** @param {MigrationBuilder} pgm */
exports.up = (pgm) => {
  pgm.addColumns('deals', {
    buyer_submitted_at: { type: 'timestamptz', notNull: false },
    seller_submitted_at: { type: 'timestamptz', notNull: false },
  });
};

/** @param {MigrationBuilder} pgm */
exports.down = (pgm) => {
  pgm.dropColumns('deals', ['buyer_submitted_at', 'seller_submitted_at']);
};
