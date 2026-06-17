/**
 * Add a `channel` column to connection_messages so buyer↔seller,
 * buyer↔middleman, and seller↔middleman conversations are kept strictly
 * separate in the same connection thread.
 *
 * Default is 'buyer_seller' so all existing messages stay in the main channel.
 */

/** @param {import('node-pg-migrate').MigrationBuilder} pgm */
exports.up = (pgm) => {
  pgm.addColumn('connection_messages', {
    channel: {
      type: 'text',
      notNull: true,
      default: 'buyer_seller',
    },
  });
  pgm.createIndex('connection_messages', ['connection_id', 'channel']);
};

/** @param {import('node-pg-migrate').MigrationBuilder} pgm */
exports.down = (pgm) => {
  pgm.dropIndex('connection_messages', ['connection_id', 'channel']);
  pgm.dropColumn('connection_messages', 'channel');
};
