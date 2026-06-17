/* eslint-disable */
/**
 * Migration creating optional historical & materialized tables for analytics/treasury ease:
 * 1. payouts (historical)
 * 2. refunds (historical)
 * 3. escrow_balances (materialized)
 * 4. failed_notifications
 */

exports.shorthands = undefined;

/** @param {import('node-pg-migrate').MigrationBuilder} pgm */
exports.up = (pgm) => {
  // 1. Payouts (historical)
  pgm.createTable('payouts', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    payout_queue_id: { type: 'uuid', references: 'payout_queue', onDelete: 'SET NULL' },
    deal_id: { type: 'uuid', notNull: true, references: 'deals', onDelete: 'CASCADE' },
    recipient_address: { type: 'text', notNull: true },
    amount_smallest_unit: { type: 'bigint', notNull: true },
    coin: { type: 'text', notNull: true },
    network: { type: 'text', notNull: true },
    tx_hash: { type: 'text' },
    settled_at: { type: 'timestamp', notNull: true, default: pgm.func('now()') },
    created_at: { type: 'timestamp', notNull: true, default: pgm.func('now()') },
  });
  pgm.createIndex('payouts', 'deal_id');

  // 2. Refunds (historical)
  pgm.createTable('refunds', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    deal_id: { type: 'uuid', notNull: true, references: 'deals', onDelete: 'CASCADE' },
    recipient_address: { type: 'text', notNull: true },
    amount_smallest_unit: { type: 'bigint', notNull: true },
    coin: { type: 'text', notNull: true },
    network: { type: 'text', notNull: true },
    tx_hash: { type: 'text' },
    settled_at: { type: 'timestamp', notNull: true, default: pgm.func('now()') },
    created_at: { type: 'timestamp', notNull: true, default: pgm.func('now()') },
  });
  pgm.createIndex('refunds', 'deal_id');

  // 3. Escrow Balances (materialized)
  pgm.createTable('escrow_balances', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    deal_id: {
      type: 'uuid',
      notNull: true,
      unique: true,
      references: 'deals',
      onDelete: 'CASCADE',
    },
    coin: { type: 'text', notNull: true },
    network: { type: 'text', notNull: true },
    balance_smallest_unit: { type: 'bigint', notNull: true, default: 0 },
    updated_at: { type: 'timestamp', notNull: true, default: pgm.func('now()') },
    created_at: { type: 'timestamp', notNull: true, default: pgm.func('now()') },
  });

  // 4. Failed Notifications
  pgm.createTable('failed_notifications', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    notification_id: {
      type: 'uuid',
      notNull: true,
      references: 'notifications',
      onDelete: 'CASCADE',
    },
    user_id: { type: 'uuid', references: 'users', onDelete: 'CASCADE' },
    channel: { type: 'text', notNull: true },
    error_message: { type: 'text' },
    retry_count: { type: 'integer', notNull: true, default: 0 },
    failed_at: { type: 'timestamp', notNull: true, default: pgm.func('now()') },
  });
  pgm.createIndex('failed_notifications', 'notification_id');
};

/** @param {import('node-pg-migrate').MigrationBuilder} pgm */
exports.down = (pgm) => {
  pgm.dropTable('failed_notifications');
  pgm.dropTable('escrow_balances');
  pgm.dropTable('refunds');
  pgm.dropTable('payouts');
};
