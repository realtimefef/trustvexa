/* eslint-disable */
/**
 * Adds `deals.item_description` — a short free-text label for the deal item.
 * Previously `itemDescription` was accepted by the API but never persisted;
 * this column ensures it is stored and shown on the deal detail page.
 */

exports.shorthands = undefined;

/** @param {import('node-pg-migrate').MigrationBuilder} pgm */
exports.up = (pgm) => {
  pgm.addColumn('deals', {
    item_description: { type: 'text' },
  });
};

/** @param {import('node-pg-migrate').MigrationBuilder} pgm */
exports.down = (pgm) => {
  pgm.dropColumn('deals', 'item_description');
};
