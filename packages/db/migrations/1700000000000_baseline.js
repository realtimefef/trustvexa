/* eslint-disable */
/**
 * Baseline migration (empty).
 *
 * This is the intentional, empty baseline that establishes the migrations
 * table and the starting point of the schema's version history. It creates NO
 * tables — the full §16 3NF schema is introduced by task group 2 as a series of
 * reviewed, versioned migrations on top of this baseline.
 *
 * Migration tool: node-pg-migrate. Migrations are applied with up/down support
 * and the connection string is read from the `DATABASE_URL` environment
 * variable (provided by Render — Requirement 41.7). *(Requirements 43.1, 43.4)*
 *
 * @typedef {import('node-pg-migrate').MigrationBuilder} MigrationBuilder
 */

/** node-pg-migrate uses the default `pgmigrations` tracking table. */
exports.shorthands = undefined;

/**
 * Apply the baseline. Intentionally a no-op: it only records that the schema
 * history has started so subsequent migrations have a known starting point.
 *
 * @param {MigrationBuilder} pgm
 */
exports.up = (pgm) => {
  // Intentionally empty. Real tables are created by task group 2 migrations.
  void pgm;
};

/**
 * Revert the baseline. Intentionally a no-op since the baseline creates nothing.
 *
 * @param {MigrationBuilder} pgm
 */
exports.down = (pgm) => {
  // Intentionally empty. Nothing to undo for the baseline.
  void pgm;
};
