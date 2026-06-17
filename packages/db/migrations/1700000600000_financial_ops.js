/* eslint-disable */
/**
 * §32 financial-ops table group migration (task 2.6) — ledger + money rules.
 *
 * Creates the §16/§32 financial-ops tables exactly as listed: ledger_accounts,
 * ledger_entries (index deal_id, entry_group_id; each group balances),
 * token_contract_allowlist (unique (coin, network, contract_address)),
 * money_precision_rules, payout_preflight_checks, gas_reserve_rules,
 * gas_top_up_events, encryption_key_versions, key_rotation_events, backup_jobs,
 * restore_tests, disaster_recovery_targets, dead_letter_jobs, legal_holds,
 * appeal_requests, reserved_names, domain_security_checks, secret_scan_results,
 * admin_setting_changes.
 *
 * Closes the cross-group FK deferred by task 2.2:
 *   payments.token_contract_id -> token_contract_allowlist(id), added here once
 *   token_contract_allowlist exists.
 *
 * Double-entry ledger: every money movement is one entry_group_id whose debit
 * and credit `amount_smallest_unit` (bigint) sum to zero. *(Requirements 17.6, 17.8, 43.7, 43.4)*
 *
 * @typedef {import('node-pg-migrate').MigrationBuilder} MigrationBuilder
 */

exports.shorthands = undefined;

/** @param {MigrationBuilder} pgm */
exports.up = (pgm) => {
  const createdAt = { type: 'timestamptz', notNull: true, default: pgm.func('now()') };
  const id = { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') };

  pgm.createType('ledger_direction', ['debit', 'credit']);

  pgm.createTable('ledger_accounts', {
    id,
    account_type: { type: 'text', notNull: true },
    coin: { type: 'text' },
    network: { type: 'text' },
    owner_user_id: { type: 'uuid', references: 'users', onDelete: 'SET NULL' },
    deal_id: { type: 'uuid', references: 'deals', onDelete: 'SET NULL' },
    created_at: createdAt,
  });

  pgm.createTable('ledger_entries', {
    id,
    ledger_account_id: {
      type: 'uuid',
      notNull: true,
      references: 'ledger_accounts',
      onDelete: 'RESTRICT',
    },
    deal_id: { type: 'uuid', references: 'deals', onDelete: 'SET NULL' },
    payment_id: { type: 'uuid', references: 'payments', onDelete: 'SET NULL' },
    payout_queue_id: { type: 'uuid', references: 'payout_queue', onDelete: 'SET NULL' },
    settlement_id: { type: 'uuid', references: 'settlements', onDelete: 'SET NULL' },
    direction: { type: 'ledger_direction', notNull: true },
    amount_smallest_unit: { type: 'bigint', notNull: true },
    coin: { type: 'text' },
    network: { type: 'text' },
    entry_group_id: { type: 'uuid', notNull: true },
    reason: { type: 'text' },
    created_at: createdAt,
  });
  pgm.createIndex('ledger_entries', 'deal_id');
  pgm.createIndex('ledger_entries', 'entry_group_id');

  pgm.createTable('token_contract_allowlist', {
    id,
    coin: { type: 'text', notNull: true },
    network: { type: 'text', notNull: true },
    contract_address: { type: 'text', notNull: true },
    token_symbol: { type: 'text' },
    decimals: { type: 'integer' },
    is_active: { type: 'boolean', notNull: true, default: true },
    verified_source: { type: 'text' },
    created_at: createdAt,
  });
  pgm.addConstraint(
    'token_contract_allowlist',
    'token_contract_allowlist_coin_network_addr_unique',
    {
      unique: ['coin', 'network', 'contract_address'],
    },
  );

  // Close the cross-group FK deferred by task 2.2 (payments created in 2.2).
  pgm.addConstraint('payments', 'payments_token_contract_id_fkey', {
    foreignKeys: {
      columns: 'token_contract_id',
      references: 'token_contract_allowlist(id)',
      onDelete: 'SET NULL',
    },
  });
  pgm.createIndex('payments', 'token_contract_id');

  pgm.createTable('money_precision_rules', {
    id,
    coin: { type: 'text', notNull: true },
    network: { type: 'text', notNull: true },
    decimals: { type: 'integer', notNull: true },
    smallest_unit_name: { type: 'text' },
    rounding_mode: { type: 'text' },
    min_transfer_smallest_unit: { type: 'bigint' },
    created_at: createdAt,
  });

  pgm.createTable('payout_preflight_checks', {
    id,
    payout_queue_id: { type: 'uuid', references: 'payout_queue', onDelete: 'SET NULL' },
    payment_id: { type: 'uuid', references: 'payments', onDelete: 'SET NULL' },
    deal_id: { type: 'uuid', notNull: true, references: 'deals', onDelete: 'CASCADE' },
    check_type: { type: 'text', notNull: true },
    result: { type: 'text' },
    message: { type: 'text' },
    checked_by: { type: 'uuid', references: 'users', onDelete: 'SET NULL' },
    created_at: createdAt,
  });
  pgm.createIndex('payout_preflight_checks', 'deal_id');

  pgm.createTable('gas_reserve_rules', {
    id,
    coin: { type: 'text' },
    network: { type: 'text' },
    native_gas_coin: { type: 'text' },
    min_hot_wallet_gas_balance: { type: 'bigint' },
    top_up_to_balance: { type: 'bigint' },
    created_at: createdAt,
  });

  pgm.createTable('gas_top_up_events', {
    id,
    coin: { type: 'text' },
    network: { type: 'text' },
    from_address: { type: 'text' },
    to_hot_wallet_address: { type: 'text' },
    amount_smallest_unit: { type: 'bigint' },
    tx_hash: { type: 'text' },
    status: { type: 'text' },
    created_at: createdAt,
  });

  pgm.createTable('encryption_key_versions', {
    id,
    key_purpose: { type: 'text', notNull: true },
    version: { type: 'integer', notNull: true },
    status: { type: 'text', notNull: true, default: 'active' },
    retired_at: { type: 'timestamptz' },
    created_at: createdAt,
  });

  pgm.createTable('key_rotation_events', {
    id,
    key_version_id: {
      type: 'uuid',
      notNull: true,
      references: 'encryption_key_versions',
      onDelete: 'RESTRICT',
    },
    started_by: { type: 'uuid', references: 'users', onDelete: 'SET NULL' },
    status: { type: 'text' },
    records_reencrypted: { type: 'integer' },
    started_at: { type: 'timestamptz' },
    completed_at: { type: 'timestamptz' },
    created_at: createdAt,
  });

  pgm.createTable('backup_jobs', {
    id,
    backup_type: { type: 'text' },
    status: { type: 'text' },
    storage_location: { type: 'text' },
    started_at: { type: 'timestamptz' },
    completed_at: { type: 'timestamptz' },
    created_at: createdAt,
  });

  pgm.createTable('restore_tests', {
    id,
    backup_job_id: { type: 'uuid', references: 'backup_jobs', onDelete: 'SET NULL' },
    test_type: { type: 'text' },
    result: { type: 'text' },
    tested_by: { type: 'uuid', references: 'users', onDelete: 'SET NULL' },
    tested_at: { type: 'timestamptz' },
    created_at: createdAt,
  });

  pgm.createTable('disaster_recovery_targets', {
    id,
    scope: { type: 'text' },
    rpo_minutes: { type: 'integer' },
    rto_minutes: { type: 'integer' },
    runbook_url: { type: 'text' },
    created_at: createdAt,
  });

  pgm.createTable('dead_letter_jobs', {
    id,
    job_type: { type: 'text' },
    original_job_id: { type: 'text' },
    payload_enc: { type: 'text' },
    failure_reason: { type: 'text' },
    retry_count: { type: 'integer', notNull: true, default: 0 },
    status: { type: 'text' },
    last_failed_at: { type: 'timestamptz' },
    created_at: createdAt,
  });

  pgm.createTable('legal_holds', {
    id,
    target_type: { type: 'text', notNull: true },
    target_id: { type: 'uuid' },
    reason: { type: 'text' },
    placed_by: { type: 'uuid', references: 'users', onDelete: 'SET NULL' },
    placed_at: { type: 'timestamptz' },
    released_by: { type: 'uuid', references: 'users', onDelete: 'SET NULL' },
    released_at: { type: 'timestamptz' },
    created_at: createdAt,
  });

  pgm.createTable('appeal_requests', {
    id,
    user_id: { type: 'uuid', notNull: true, references: 'users', onDelete: 'CASCADE' },
    restriction_type: { type: 'text' },
    reason_enc: { type: 'text' },
    status: { type: 'text' },
    decision_reason: { type: 'text' },
    decided_by: { type: 'uuid', references: 'users', onDelete: 'SET NULL' },
    decided_at: { type: 'timestamptz' },
    created_at: createdAt,
  });

  pgm.createTable('reserved_names', {
    id,
    reserved_value: { type: 'text', notNull: true },
    reserved_type: { type: 'text' },
    reason: { type: 'text' },
    created_at: createdAt,
  });

  pgm.createTable('domain_security_checks', {
    id,
    domain: { type: 'text' },
    registrar_lock_status: { type: 'text' },
    dnssec_status: { type: 'text' },
    caa_status: { type: 'text' },
    certificate_expiry_at: { type: 'timestamptz' },
    last_checked_at: { type: 'timestamptz' },
    created_at: createdAt,
  });

  pgm.createTable('secret_scan_results', {
    id,
    commit_sha: { type: 'text' },
    branch: { type: 'text' },
    scanner: { type: 'text' },
    status: { type: 'text' },
    finding_count: { type: 'integer' },
    blocked_deploy: { type: 'boolean', notNull: true, default: false },
    created_at: createdAt,
  });

  pgm.createTable('admin_setting_changes', {
    id,
    actor_id: { type: 'uuid', references: 'users', onDelete: 'SET NULL' },
    setting_key: { type: 'text' },
    old_value_enc: { type: 'text' },
    new_value_enc: { type: 'text' },
    reason: { type: 'text' },
    status: { type: 'text' },
    cooldown_until: { type: 'timestamptz' },
    applied_at: { type: 'timestamptz' },
    rollback_at: { type: 'timestamptz' },
    created_at: createdAt,
  });
};

/** @param {MigrationBuilder} pgm */
exports.down = (pgm) => {
  pgm.dropTable('admin_setting_changes');
  pgm.dropTable('secret_scan_results');
  pgm.dropTable('domain_security_checks');
  pgm.dropTable('reserved_names');
  pgm.dropTable('appeal_requests');
  pgm.dropTable('legal_holds');
  pgm.dropTable('dead_letter_jobs');
  pgm.dropTable('disaster_recovery_targets');
  pgm.dropTable('restore_tests');
  pgm.dropTable('backup_jobs');
  pgm.dropTable('key_rotation_events');
  pgm.dropTable('encryption_key_versions');
  pgm.dropTable('gas_top_up_events');
  pgm.dropTable('gas_reserve_rules');
  pgm.dropTable('payout_preflight_checks');
  pgm.dropTable('money_precision_rules');

  // Remove the FK + index re-added on payments before dropping the allowlist.
  pgm.dropIndex('payments', 'token_contract_id');
  pgm.dropConstraint('payments', 'payments_token_contract_id_fkey');
  pgm.dropTable('token_contract_allowlist');

  pgm.dropTable('ledger_entries');
  pgm.dropTable('ledger_accounts');
  pgm.dropType('ledger_direction');
};
