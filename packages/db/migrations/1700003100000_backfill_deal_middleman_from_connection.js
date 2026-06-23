/* eslint-disable */
/**
 * Data-repair migration: backfill deals.middleman_id from the connection the
 * deal was created from. Earlier, deals created from a connection that already
 * had a middleman did not inherit it (fixed at creation time in code, but
 * existing deals were left with middleman_id = NULL even though their
 * connection had one). This sets the deal's middleman to the connection's
 * middleman wherever the deal has none and the connection has one.
 *
 * @typedef {import('node-pg-migrate').MigrationBuilder} MigrationBuilder
 */

exports.shorthands = undefined;

/** @param {MigrationBuilder} pgm */
exports.up = (pgm) => {
  pgm.sql(`
    UPDATE deals d
       SET middleman_id = c.middleman_id,
           updated_at   = now()
      FROM connections c
     WHERE c.deal_id = d.id
       AND d.middleman_id IS NULL
       AND c.middleman_id IS NOT NULL;
  `);
};

/** @param {MigrationBuilder} _pgm */
exports.down = (_pgm) => {
  /* Non-reversible data repair. */
};
