/* eslint-disable */
/**
 * Simple mutual-agreement lock for the streamlined flow.
 *
 * Each party marks agreement; when BOTH buyer and seller have agreed the deal
 * is locked (`locked_at` set) and becomes immutable — after which the pay step
 * opens. These columns are additive and independent of the full state machine.
 *
 *   deals.buyer_agreed_at   set when the buyer agrees
 *   deals.seller_agreed_at  set when the seller agrees
 *   deals.locked_at         set once both have agreed (immutable thereafter)
 *
 * @typedef {import('node-pg-migrate').MigrationBuilder} MigrationBuilder
 */

exports.shorthands = undefined;

/** @param {MigrationBuilder} pgm */
exports.up = (pgm) => {
  pgm.addColumns('deals', {
    buyer_agreed_at: { type: 'timestamptz' },
    seller_agreed_at: { type: 'timestamptz' },
    locked_at: { type: 'timestamptz' },
  });
};

/** @param {MigrationBuilder} pgm */
exports.down = (pgm) => {
  pgm.dropColumns('deals', ['buyer_agreed_at', 'seller_agreed_at', 'locked_at']);
};
