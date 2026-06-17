/* eslint-disable */
/**
 * Migration creating message_pins table:
 */

exports.shorthands = undefined;

/** @param {import('node-pg-migrate').MigrationBuilder} pgm */
exports.up = (pgm) => {
  pgm.createTable('message_pins', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    message_id: {
      type: 'uuid',
      notNull: true,
      unique: true,
      references: 'messages',
      onDelete: 'CASCADE',
    },
    pinned_by: { type: 'uuid', notNull: true, references: 'users', onDelete: 'CASCADE' },
    chat_id: { type: 'uuid', notNull: true, references: 'chats', onDelete: 'CASCADE' },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
  });
  pgm.createIndex('message_pins', 'chat_id');
};

/** @param {import('node-pg-migrate').MigrationBuilder} pgm */
exports.down = (pgm) => {
  pgm.dropTable('message_pins');
};
