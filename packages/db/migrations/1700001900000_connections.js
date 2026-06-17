/* eslint-disable */
/**
 * Connections: direct buyer<->seller conversations that exist BEFORE a deal.
 *
 * One user creates a connection and gets a short human-friendly code; the other
 * user joins with that code. The two participants can chat directly. A deal can
 * later be created from the connection (connections.deal_id is then set), but
 * the conversation does not require a deal to exist.
 *
 *   connections
 *     - code           short join code (unique)
 *     - creator_id     the user who started it
 *     - joiner_id      the user who joined (null until joined)
 *     - deal_id        set once a deal is created from this connection
 *     - status         'open' | 'closed'
 *   connection_messages
 *     - connection_id, sender_id, body, created_at
 *
 * @typedef {import('node-pg-migrate').MigrationBuilder} MigrationBuilder
 */

exports.shorthands = undefined;

/** @param {MigrationBuilder} pgm */
exports.up = (pgm) => {
  pgm.createType('connection_status', ['open', 'closed']);

  pgm.createTable('connections', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    code: { type: 'text', notNull: true, unique: true },
    creator_id: { type: 'uuid', notNull: true, references: 'users', onDelete: 'CASCADE' },
    joiner_id: { type: 'uuid', references: 'users', onDelete: 'SET NULL' },
    deal_id: { type: 'uuid', references: 'deals', onDelete: 'SET NULL' },
    status: { type: 'connection_status', notNull: true, default: 'open' },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
    updated_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
  });
  pgm.createIndex('connections', 'creator_id');
  pgm.createIndex('connections', 'joiner_id');

  pgm.createTable('connection_messages', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    connection_id: { type: 'uuid', notNull: true, references: 'connections', onDelete: 'CASCADE' },
    sender_id: { type: 'uuid', notNull: true, references: 'users', onDelete: 'CASCADE' },
    body: { type: 'text', notNull: true },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
  });
  pgm.createIndex('connection_messages', 'connection_id');
};

/** @param {MigrationBuilder} pgm */
exports.down = (pgm) => {
  pgm.dropTable('connection_messages');
  pgm.dropTable('connections');
  pgm.dropType('connection_status');
};
