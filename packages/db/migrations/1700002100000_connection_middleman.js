/**
 * Add middleman_id to connections so a buyer↔seller chat can invite the
 * platform middleman into the same thread. The column is nullable (most
 * connections never need a middleman).
 */

/** @param {import('node-pg-migrate').MigrationBuilder} pgm */
exports.up = (pgm) => {
  pgm.addColumn('connections', {
    middleman_id: {
      type: 'uuid',
      references: '"users"',
      onDelete: 'SET NULL',
      notNull: false,
    },
  });
  pgm.createIndex('connections', ['middleman_id']);
};

/** @param {import('node-pg-migrate').MigrationBuilder} pgm */
exports.down = (pgm) => {
  pgm.dropIndex('connections', ['middleman_id']);
  pgm.dropColumn('connections', 'middleman_id');
};
