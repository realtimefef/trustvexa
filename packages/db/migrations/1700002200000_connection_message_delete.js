/**
 * Add soft-delete support to connection_messages so individual messages can be
 * removed by their sender without affecting the conversation history.
 */

/** @param {import('node-pg-migrate').MigrationBuilder} pgm */
exports.up = (pgm) => {
  pgm.addColumn('connection_messages', {
    deleted_at: { type: 'timestamptz', notNull: false },
  });
};

/** @param {import('node-pg-migrate').MigrationBuilder} pgm */
exports.down = (pgm) => {
  pgm.dropColumn('connection_messages', 'deleted_at');
};
