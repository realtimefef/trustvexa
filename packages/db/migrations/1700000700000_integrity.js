/* eslint-disable */
/**
 * §33 integrity table group migration (task 2.7).
 *
 * Creates: treasury_snapshots, idempotency_keys (unique key), deal_locks,
 * collusion_signals, price_sanity_checks, feature_flags (unique flag_key),
 * staff_roles (unique role_key), role_permissions (unique (role_id,
 * permission_key)), user_role_assignments (unique (user_id, role_id)).
 *
 * staff_roles is created before role_permissions / user_role_assignments which
 * reference it. Treasury balances are integer smallest units (bigint) for
 * exact reconciliation. *(Requirements 17.11, 17.13, 33, 35, 43.7)*
 *
 * @typedef {import('node-pg-migrate').MigrationBuilder} MigrationBuilder
 */

exports.shorthands = undefined;

/** @param {MigrationBuilder} pgm */
exports.up = (pgm) => {
  const createdAt = { type: 'timestamptz', notNull: true, default: pgm.func('now()') };
  const id = { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') };

  pgm.createTable('treasury_snapshots', {
    id,
    snapshot_at: { type: 'timestamptz' },
    coin: { type: 'text' },
    network: { type: 'text' },
    held_in_escrow: { type: 'bigint' },
    owed_to_sellers: { type: 'bigint' },
    refunds_owed: { type: 'bigint' },
    platform_fee_revenue: { type: 'bigint' },
    gas_spent: { type: 'bigint' },
    hot_balance: { type: 'bigint' },
    cold_balance: { type: 'bigint' },
    ledger_balance: { type: 'bigint' },
    onchain_balance: { type: 'bigint' },
    reconciled: { type: 'boolean', notNull: true, default: false },
    created_at: createdAt,
  });

  pgm.createTable('idempotency_keys', {
    id,
    key: { type: 'text', notNull: true, unique: true },
    user_id: { type: 'uuid', references: 'users', onDelete: 'SET NULL' },
    action_type: { type: 'text' },
    deal_id: { type: 'uuid', references: 'deals', onDelete: 'SET NULL' },
    request_hash: { type: 'text' },
    response_ref: { type: 'text' },
    status: { type: 'text', notNull: true, default: 'in_progress' },
    expires_at: { type: 'timestamptz' },
    created_at: createdAt,
  });

  pgm.createTable('deal_locks', {
    id,
    deal_id: { type: 'uuid', notNull: true, references: 'deals', onDelete: 'CASCADE' },
    entity_type: { type: 'text', notNull: true },
    version_no: { type: 'integer', notNull: true, default: 0 },
    locked_by: { type: 'uuid', references: 'users', onDelete: 'SET NULL' },
    updated_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
    created_at: createdAt,
  });
  pgm.createIndex('deal_locks', 'deal_id');

  pgm.createTable('collusion_signals', {
    id,
    deal_id: { type: 'uuid', references: 'deals', onDelete: 'SET NULL' },
    user_a_id: { type: 'uuid', references: 'users', onDelete: 'SET NULL' },
    user_b_id: { type: 'uuid', references: 'users', onDelete: 'SET NULL' },
    signal_type: { type: 'text' },
    severity: { type: 'text' },
    details: { type: 'text' },
    status: { type: 'text' },
    created_at: createdAt,
  });

  pgm.createTable('price_sanity_checks', {
    id,
    coin: { type: 'text' },
    fiat: { type: 'text' },
    observed_rate: { type: 'numeric' },
    expected_rate: { type: 'numeric' },
    deviation_pct: { type: 'numeric' },
    within_band: { type: 'boolean' },
    action: { type: 'text' },
    checked_at: { type: 'timestamptz' },
    created_at: createdAt,
  });

  pgm.createTable('feature_flags', {
    id,
    flag_key: { type: 'text', notNull: true, unique: true },
    description: { type: 'text' },
    is_enabled: { type: 'boolean', notNull: true, default: false },
    scope: { type: 'text' },
    updated_by: { type: 'uuid', references: 'users', onDelete: 'SET NULL' },
    created_at: createdAt,
  });

  pgm.createTable('staff_roles', {
    id,
    role_key: { type: 'text', notNull: true, unique: true },
    name: { type: 'text' },
    description: { type: 'text' },
    is_system: { type: 'boolean', notNull: true, default: false },
    created_at: createdAt,
  });

  pgm.createTable('role_permissions', {
    id,
    role_id: { type: 'uuid', notNull: true, references: 'staff_roles', onDelete: 'CASCADE' },
    permission_key: { type: 'text', notNull: true },
    allowed: { type: 'boolean', notNull: true, default: false },
    created_at: createdAt,
  });
  pgm.addConstraint('role_permissions', 'role_permissions_role_permission_unique', {
    unique: ['role_id', 'permission_key'],
  });

  pgm.createTable('user_role_assignments', {
    id,
    user_id: { type: 'uuid', notNull: true, references: 'users', onDelete: 'CASCADE' },
    role_id: { type: 'uuid', notNull: true, references: 'staff_roles', onDelete: 'CASCADE' },
    assigned_by: { type: 'uuid', references: 'users', onDelete: 'SET NULL' },
    created_at: createdAt,
  });
  pgm.addConstraint('user_role_assignments', 'user_role_assignments_user_role_unique', {
    unique: ['user_id', 'role_id'],
  });
};

/** @param {MigrationBuilder} pgm */
exports.down = (pgm) => {
  pgm.dropTable('user_role_assignments');
  pgm.dropTable('role_permissions');
  pgm.dropTable('staff_roles');
  pgm.dropTable('feature_flags');
  pgm.dropTable('price_sanity_checks');
  pgm.dropTable('collusion_signals');
  pgm.dropTable('deal_locks');
  pgm.dropTable('idempotency_keys');
  pgm.dropTable('treasury_snapshots');
};
