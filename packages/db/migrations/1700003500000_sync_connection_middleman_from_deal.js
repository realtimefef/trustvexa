/* eslint-disable */
/**
 * Backfill: copy each deal's middleman onto its linked connection when the
 * connection has no middleman yet. The /connect chat reveals the buyer_mm /
 * seller_mm channels (and lets the middleman post) based on the CONNECTION's
 * middleman_id — historically only the deal's middleman_id was set when a
 * middleman was added, so those chats never showed. This syncs existing rows;
 * requestMiddleman keeps them in sync going forward.
 *
 * @typedef {import('node-pg-migrate').MigrationBuilder} MigrationBuilder
 */

exports.shorthands = undefined;

/** @param {MigrationBuilder} pgm */
exports.up = (pgm) => {
  pgm.sql(`
    UPDATE connections c
       SET middleman_id = d.middleman_id,
           updated_at = now()
      FROM deals d
     WHERE c.deal_id = d.id
       AND d.middleman_id IS NOT NULL
       AND c.middleman_id IS NULL;
  `);
};

/** @param {MigrationBuilder} _pgm */
exports.down = (_pgm) => {
  /* Non-reversible data sync. */
};
