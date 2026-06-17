/* eslint-disable */
/**
 * Migration adding TOTP, preferences, and webhook tables:
 */

exports.shorthands = undefined;

/** @param {import('node-pg-migrate').MigrationBuilder} pgm */
exports.up = (pgm) => {
  // Alter payout_queue.deal_id to allow null (for stand-alone wallet withdrawals)
  pgm.alterColumn('payout_queue', 'deal_id', { allowNull: true });

  // Add TOTP columns to users table
  pgm.addColumns('users', {
    totp_secret_enc: { type: 'text' },
    totp_enabled: { type: 'boolean', notNull: true, default: false },
    totp_backup_codes_enc: { type: 'text' },
  });

  // Add email_digest_frequency column to user_preferences
  pgm.addColumns('user_preferences', {
    email_digest_frequency: { type: 'text', notNull: true, default: 'immediate' },
  });

  // Create webhooks table
  pgm.createTable('webhooks', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    user_id: { type: 'uuid', notNull: true, references: 'users', onDelete: 'CASCADE' },
    url: { type: 'text', notNull: true },
    secret: { type: 'text', notNull: true },
    events: { type: 'text[]', notNull: true },
    active: { type: 'boolean', notNull: true, default: true },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
  });
  pgm.createIndex('webhooks', 'user_id');

  // Create webhook_logs table
  pgm.createTable('webhook_logs', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    webhook_id: { type: 'uuid', notNull: true, references: 'webhooks', onDelete: 'CASCADE' },
    event_type: { type: 'text', notNull: true },
    payload: { type: 'jsonb', notNull: true },
    status_code: { type: 'integer' },
    response_body: { type: 'text' },
    success: { type: 'boolean', notNull: true },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
  });
  pgm.createIndex('webhook_logs', 'webhook_id');
};

/** @param {import('node-pg-migrate').MigrationBuilder} pgm */
exports.down = (pgm) => {
  pgm.dropTable('webhook_logs');
  pgm.dropTable('webhooks');
  pgm.dropColumns('user_preferences', ['email_digest_frequency']);
  pgm.dropColumns('users', ['totp_secret_enc', 'totp_enabled', 'totp_backup_codes_enc']);
  pgm.alterColumn('payout_queue', 'deal_id', { allowNull: false });
};
