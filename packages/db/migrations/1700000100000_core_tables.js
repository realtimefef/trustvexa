/* eslint-disable */
/**
 * Core tables migration (task 2.1).
 *
 * Creates the §16 "Core" 3NF tables: `users`, `trust_events`,
 * `user_payout_addresses`, and `display_name_changes`, exactly as listed in the
 * design's Data Models -> Core table. Every table has an `id` primary key and a
 * `created_at`; `users` additionally carries `updated_at`. PII is stored as
 * envelope-encrypted payloads (`*_enc`); searchable lookups use non-sensitive
 * hashes (`*_hash`). `users.password_hash` is an Argon2/bcrypt hash that is
 * never returned to any party. *(Requirements 43.7, 17.1, 31.6, 43.4)*
 *
 * ── ID / timestamp conventions (followed by all later migration groups) ──
 *   - Primary keys are `uuid` defaulted to `gen_random_uuid()` (pgcrypto, which
 *     is created `IF NOT EXISTS` below and intentionally NOT dropped on `down`
 *     because later migration groups depend on it).
 *   - Foreign keys are `uuid` columns referencing the parent's `id`.
 *   - Timestamps are `timestamptz`; lifecycle timestamps that mark "now"
 *     default to `now()` (`created_at`, `updated_at`).
 *
 * ── Cross-group foreign keys deferred ──
 *   - `trust_events.deal_id` references the `deals` table, which is created in a
 *     LATER migration group (task 2.2). The column is created here WITHOUT an
 *     inline FK; the FK constraint to `deals(id)` is added in that later
 *     migration once `deals` exists.
 *
 * Migration tool: node-pg-migrate (CommonJS, `DATABASE_URL`). *(Requirements 43.1, 43.4)*
 *
 * @typedef {import('node-pg-migrate').MigrationBuilder} MigrationBuilder
 */

exports.shorthands = undefined;

/**
 * Apply the Core tables.
 *
 * @param {MigrationBuilder} pgm
 */
exports.up = (pgm) => {
  // gen_random_uuid() is provided by pgcrypto. Created here so the whole schema
  // can rely on uuid primary keys. Intentionally not dropped on `down`.
  pgm.createExtension('pgcrypto', { ifNotExists: true });

  // Enumerated value sets from the design's Core -> users row.
  pgm.createType('account_type', ['user', 'middleman']);
  pgm.createType('account_status', ['active', 'deactivated', 'under_review', 'blocked', 'deleted']);
  pgm.createType('account_label', [
    'new_user',
    'good_standing',
    'trusted',
    'high_risk',
    'middleman_verified',
  ]);

  // users -------------------------------------------------------------------
  pgm.createTable('users', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    username: { type: 'text', notNull: true, unique: true },
    email_enc: { type: 'text' },
    email_hash: { type: 'text', unique: true },
    recovery_email_enc: { type: 'text' },
    recovery_email_hash: { type: 'text' },
    signup_details_enc: { type: 'text' },
    avatar_file_key: { type: 'text' },
    account_type: { type: 'account_type', notNull: true },
    account_status: { type: 'account_status', notNull: true, default: 'active' },
    account_label: { type: 'account_label', notNull: true, default: 'new_user' },
    // Argon2/bcrypt hash — never returned to any party, including the middleman.
    password_hash: { type: 'text' },
    trust_level: { type: 'integer', notNull: true, default: 0 },
    missed_deadline_count: { type: 'integer', notNull: true, default: 0 },
    legal_hold: { type: 'boolean', notNull: true, default: false },
    age_confirmed_at: { type: 'timestamptz' },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
    updated_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
  });
  pgm.createIndex('users', 'account_status');

  // trust_events ------------------------------------------------------------
  pgm.createTable('trust_events', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    user_id: { type: 'uuid', notNull: true, references: 'users', onDelete: 'RESTRICT' },
    change: { type: 'integer', notNull: true },
    reason: { type: 'text' },
    // FK to deals(id) is intentionally omitted here: the `deals` table is
    // created in a later migration group (task 2.2). The FK constraint is added
    // in that later migration once `deals` exists.
    deal_id: { type: 'uuid' },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
  });
  pgm.createIndex('trust_events', 'user_id');

  // user_payout_addresses ---------------------------------------------------
  pgm.createTable('user_payout_addresses', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    user_id: { type: 'uuid', notNull: true, references: 'users', onDelete: 'RESTRICT' },
    coin: { type: 'text', notNull: true },
    network: { type: 'text', notNull: true },
    address_enc: { type: 'text' },
    address_hash: { type: 'text' },
    validation_status: { type: 'text' },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
  });
  pgm.createIndex('user_payout_addresses', 'user_id');

  // display_name_changes ----------------------------------------------------
  pgm.createTable('display_name_changes', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    user_id: { type: 'uuid', notNull: true, references: 'users', onDelete: 'RESTRICT' },
    old_display_name: { type: 'text' },
    new_display_name: { type: 'text' },
    changed_at: { type: 'timestamptz' },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
  });
  pgm.createIndex('display_name_changes', 'user_id');
};

/**
 * Revert the Core tables. Drops in reverse dependency order (children before
 * `users`), then the enum types. The pgcrypto extension is intentionally left
 * in place because later migration groups also rely on it.
 *
 * @param {MigrationBuilder} pgm
 */
exports.down = (pgm) => {
  pgm.dropTable('display_name_changes');
  pgm.dropTable('user_payout_addresses');
  pgm.dropTable('trust_events');
  pgm.dropTable('users');

  pgm.dropType('account_label');
  pgm.dropType('account_status');
  pgm.dropType('account_type');
};
