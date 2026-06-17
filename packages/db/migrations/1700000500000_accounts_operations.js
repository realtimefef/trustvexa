/* eslint-disable */
/**
 * Accounts & operations table group migration (task 2.5).
 *
 * Creates the full §16 "Accounts & operations" set exactly as listed in the
 * design (73 tables), with every unique constraint and index the design calls
 * out. Conventions inherited from tasks 2.1/2.2 (uuid PK gen_random_uuid(),
 * timestamptz + created_at default now(), uuid FKs).
 *
 * Money is integer smallest units in `*_smallest_unit` / cap columns (bigint);
 * fiat reference values use bigint cents. Operational status columns are `text`
 * carrying the design's documented value vocabularies (kept as text rather than
 * dozens of narrow enum types, for a robust, migratable operational schema);
 * the core domain enums stay typed in their owning groups (2.2/2.3/2.4/2.6).
 * *(Requirements 43.7, 43.4)*
 *
 * @typedef {import('node-pg-migrate').MigrationBuilder} MigrationBuilder
 */

exports.shorthands = undefined;

/** @param {MigrationBuilder} pgm */
exports.up = (pgm) => {
  const ts = (extra = {}) => ({ type: 'timestamptz', ...extra });
  const createdAt = { type: 'timestamptz', notNull: true, default: pgm.func('now()') };
  const id = { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') };
  const fkUser = (extra = {}) => ({
    type: 'uuid',
    references: 'users',
    onDelete: 'SET NULL',
    ...extra,
  });
  const fkDeal = (extra = {}) => ({
    type: 'uuid',
    references: 'deals',
    onDelete: 'SET NULL',
    ...extra,
  });

  // deal_invites (unique token_hash)
  pgm.createTable('deal_invites', {
    id,
    deal_id: { type: 'uuid', notNull: true, references: 'deals', onDelete: 'CASCADE' },
    token_hash: { type: 'text', notNull: true, unique: true },
    intended_user_hint: { type: 'text' },
    single_use: { type: 'boolean', notNull: true, default: true },
    expires_at: ts(),
    used_at: ts(),
    revoked_at: ts(),
    revoked_by: fkUser(),
    revoke_reason: { type: 'text' },
    created_at: createdAt,
  });
  pgm.createIndex('deal_invites', 'deal_id');

  pgm.createTable('invite_safety_snapshots', {
    id,
    invite_id: { type: 'uuid', notNull: true, references: 'deal_invites', onDelete: 'CASCADE' },
    counterparty_user_id: fkUser(),
    account_label: { type: 'text' },
    completed_deals_count: { type: 'integer' },
    dispute_rate_band: { type: 'text' },
    risk_warning: { type: 'text' },
    created_at: createdAt,
  });

  pgm.createTable('address_book', {
    id,
    user_id: { type: 'uuid', notNull: true, references: 'users', onDelete: 'CASCADE' },
    label: { type: 'text' },
    coin: { type: 'text' },
    network: { type: 'text' },
    address_enc: { type: 'text' },
    address_hash: { type: 'text' },
    validation_status: { type: 'text' },
    created_at: createdAt,
  });
  pgm.createIndex('address_book', 'user_id');

  pgm.createTable('wallet_validation_checks', {
    id,
    user_id: fkUser({ notNull: false }),
    deal_id: fkDeal(),
    coin: { type: 'text' },
    network: { type: 'text' },
    address_hash: { type: 'text' },
    result: { type: 'text' },
    message: { type: 'text' },
    created_at: createdAt,
  });

  pgm.createTable('user_sessions', {
    id,
    user_id: { type: 'uuid', notNull: true, references: 'users', onDelete: 'CASCADE' },
    device: { type: 'text' },
    ip: { type: 'text' },
    user_agent: { type: 'text' },
    remember_me: { type: 'boolean', notNull: true, default: false },
    expires_at: ts(),
    last_seen_at: ts(),
    revoked_at: ts(),
    created_at: createdAt,
  });
  pgm.createIndex('user_sessions', 'user_id');

  pgm.createTable('auth_tokens', {
    id,
    user_id: { type: 'uuid', notNull: true, references: 'users', onDelete: 'CASCADE' },
    session_id: { type: 'uuid', references: 'user_sessions', onDelete: 'SET NULL' },
    token_type: { type: 'text', notNull: true },
    token_hash: { type: 'text', notNull: true, unique: true },
    jwt_id: { type: 'text' },
    audience: { type: 'text' },
    issued_at: ts(),
    expires_at: ts(),
    used_at: ts(),
    revoked_at: ts(),
    created_at: createdAt,
  });
  pgm.createIndex('auth_tokens', 'user_id');

  pgm.createTable('revoked_tokens', {
    id,
    jwt_id: { type: 'text', notNull: true, unique: true },
    user_id: { type: 'uuid', references: 'users', onDelete: 'CASCADE' },
    reason: { type: 'text' },
    revoked_at: ts(),
    expires_at: ts(),
    created_at: createdAt,
  });

  pgm.createTable('account_security_events', {
    id,
    user_id: { type: 'uuid', notNull: true, references: 'users', onDelete: 'CASCADE' },
    event_type: { type: 'text' },
    ip: { type: 'text' },
    device: { type: 'text' },
    metadata: { type: 'jsonb' },
    created_at: createdAt,
  });
  pgm.createIndex('account_security_events', 'user_id');

  pgm.createTable('email_change_requests', {
    id,
    user_id: { type: 'uuid', notNull: true, references: 'users', onDelete: 'CASCADE' },
    old_email_hash: { type: 'text' },
    new_email_hash: { type: 'text' },
    old_confirmed_at: ts(),
    new_confirmed_at: ts(),
    status: { type: 'text' },
    created_at: createdAt,
  });

  pgm.createTable('password_change_events', {
    id,
    user_id: { type: 'uuid', notNull: true, references: 'users', onDelete: 'CASCADE' },
    changed_at: ts(),
    other_sessions_revoked_at: ts(),
    created_at: createdAt,
  });

  pgm.createTable('terms_acceptances', {
    id,
    user_id: { type: 'uuid', notNull: true, references: 'users', onDelete: 'CASCADE' },
    doc_type: { type: 'text' },
    version: { type: 'text' },
    accepted_at: ts(),
    created_at: createdAt,
  });

  pgm.createTable('deal_legal_acceptances', {
    id,
    deal_id: { type: 'uuid', notNull: true, references: 'deals', onDelete: 'CASCADE' },
    user_id: { type: 'uuid', notNull: true, references: 'users', onDelete: 'CASCADE' },
    accepted_terms_version: { type: 'text' },
    accepted_dispute_policy_version: { type: 'text' },
    accepted_crypto_risk: { type: 'boolean', notNull: true, default: false },
    accepted_wrong_network_warning: { type: 'boolean', notNull: true, default: false },
    accepted_no_prohibited_items: { type: 'boolean', notNull: true, default: false },
    accepted_at: ts(),
    created_at: createdAt,
  });
  pgm.createIndex('deal_legal_acceptances', 'deal_id');

  pgm.createTable('invoices', {
    id,
    deal_id: { type: 'uuid', notNull: true, references: 'deals', onDelete: 'RESTRICT' },
    number: { type: 'text', notNull: true, unique: true },
    pdf_key: { type: 'text' },
    created_at: createdAt,
  });

  pgm.createTable('admin_actions', {
    id,
    actor_id: fkUser(),
    action: { type: 'text', notNull: true },
    target_type: { type: 'text' },
    target_id: { type: 'uuid' },
    reason: { type: 'text' },
    requires_confirmation: { type: 'boolean', notNull: true, default: false },
    request_id: { type: 'text' },
    metadata: { type: 'jsonb' },
    prev_hash: { type: 'text' },
    entry_hash: { type: 'text' },
    created_at: createdAt,
  });
  pgm.createIndex('admin_actions', 'request_id');

  pgm.createTable('admin_overrides', {
    id,
    actor_id: fkUser(),
    deal_id: fkDeal(),
    override_type: { type: 'text' },
    old_value: { type: 'text' },
    new_value: { type: 'text' },
    reason: { type: 'text' },
    confirmed_at: ts(),
    created_at: createdAt,
  });

  pgm.createTable('admin_notes', {
    id,
    target_type: { type: 'text' },
    target_id: { type: 'uuid' },
    note_enc: { type: 'text' },
    created_by: fkUser(),
    created_at: createdAt,
  });

  pgm.createTable('support_tickets', {
    id,
    user_id: { type: 'uuid', notNull: true, references: 'users', onDelete: 'CASCADE' },
    deal_id: fkDeal(),
    request_id: { type: 'text', unique: true },
    category: { type: 'text' },
    priority: { type: 'text' },
    status: { type: 'text' },
    subject: { type: 'text' },
    body_enc: { type: 'text' },
    expected_response_at: ts(),
    last_update_at: ts(),
    created_at: createdAt,
  });
  pgm.createIndex('support_tickets', 'user_id');

  pgm.createTable('user_reports', {
    id,
    reporter_id: fkUser(),
    reported_user_id: fkUser(),
    deal_id: fkDeal(),
    reason: { type: 'text' },
    details_enc: { type: 'text' },
    status: { type: 'text' },
    created_at: createdAt,
  });

  pgm.createTable('user_blocks', {
    id,
    blocker_id: fkUser(),
    blocked_user_id: fkUser(),
    block_type: { type: 'text' },
    reason: { type: 'text' },
    created_at: createdAt,
  });

  pgm.createTable('account_deletion_requests', {
    id,
    user_id: { type: 'uuid', notNull: true, references: 'users', onDelete: 'CASCADE' },
    status: { type: 'text' },
    active_deal_count: { type: 'integer' },
    user_notice: { type: 'text' },
    requested_at: ts(),
    completed_at: ts(),
    created_at: createdAt,
  });

  pgm.createTable('account_deletions', {
    id,
    user_id: { type: 'uuid', references: 'users', onDelete: 'SET NULL' },
    requested_by: fkUser(),
    reason: { type: 'text' },
    deletion_type: { type: 'text' },
    deleted_at: ts(),
    audit_retained: { type: 'boolean', notNull: true, default: true },
    created_at: createdAt,
  });

  pgm.createTable('account_deactivations', {
    id,
    user_id: { type: 'uuid', notNull: true, references: 'users', onDelete: 'CASCADE' },
    reason: { type: 'text' },
    deactivated_at: ts(),
    reactivated_at: ts(),
    created_at: createdAt,
  });

  pgm.createTable('transaction_history_events', {
    id,
    user_id: { type: 'uuid', notNull: true, references: 'users', onDelete: 'CASCADE' },
    deal_id: fkDeal(),
    event_type: { type: 'text' },
    amount_smallest_unit: { type: 'bigint' },
    coin: { type: 'text' },
    status: { type: 'text' },
    created_at: createdAt,
  });
  pgm.createIndex('transaction_history_events', 'user_id');

  pgm.createTable('notification_deliveries', {
    id,
    notification_id: {
      type: 'uuid',
      notNull: true,
      references: 'notifications',
      onDelete: 'CASCADE',
    },
    channel: { type: 'text' },
    status: { type: 'text' },
    failure_reason: { type: 'text' },
    retry_count: { type: 'integer', notNull: true, default: 0 },
    sent_at: ts(),
    created_at: createdAt,
  });
  pgm.createIndex('notification_deliveries', 'notification_id');

  pgm.createTable('guided_help_flows', {
    id,
    issue_key: { type: 'text' },
    title: { type: 'text' },
    first_step: { type: 'text' },
    created_at: createdAt,
  });

  pgm.createTable('guided_help_steps', {
    id,
    flow_id: { type: 'uuid', notNull: true, references: 'guided_help_flows', onDelete: 'CASCADE' },
    step_order: { type: 'integer' },
    instruction: { type: 'text' },
    next_step_id: { type: 'uuid', references: 'guided_help_steps', onDelete: 'SET NULL' },
    created_at: createdAt,
  });

  pgm.createTable('email_domain_checks', {
    id,
    domain: { type: 'text' },
    spf_status: { type: 'text' },
    dkim_status: { type: 'text' },
    dmarc_status: { type: 'text' },
    last_test_email_status: { type: 'text' },
    checked_at: ts(),
    created_at: createdAt,
  });

  pgm.createTable('onboarding_tasks', {
    id,
    user_id: { type: 'uuid', notNull: true, references: 'users', onDelete: 'CASCADE' },
    task_key: { type: 'text' },
    completed_at: ts(),
    created_at: createdAt,
  });

  pgm.createTable('data_exports', {
    id,
    user_id: { type: 'uuid', notNull: true, references: 'users', onDelete: 'CASCADE' },
    status: { type: 'text' },
    file_key: { type: 'text' },
    requested_at: ts(),
    completed_at: ts(),
    created_at: createdAt,
  });

  pgm.createTable('empty_state_guides', {
    id,
    page_key: { type: 'text' },
    state_key: { type: 'text' },
    headline: { type: 'text' },
    next_action_label: { type: 'text' },
    next_action_url: { type: 'text' },
    created_at: createdAt,
  });

  pgm.createTable('support_sla_rules', {
    id,
    priority: { type: 'text' },
    expected_response_minutes: { type: 'integer' },
    created_at: createdAt,
  });

  pgm.createTable('user_preferences', {
    id,
    user_id: {
      type: 'uuid',
      notNull: true,
      unique: true,
      references: 'users',
      onDelete: 'CASCADE',
    },
    timezone: { type: 'text' },
    locale: { type: 'text' },
    theme: { type: 'text' },
    display_fiat: { type: 'text' },
    created_at: createdAt,
  });

  pgm.createTable('announcements', {
    id,
    title: { type: 'text' },
    body: { type: 'text' },
    audience: { type: 'text' },
    starts_at: ts(),
    ends_at: ts(),
    created_by: fkUser(),
    created_at: createdAt,
  });

  pgm.createTable('announcement_reads', {
    id,
    announcement_id: {
      type: 'uuid',
      notNull: true,
      references: 'announcements',
      onDelete: 'CASCADE',
    },
    user_id: { type: 'uuid', notNull: true, references: 'users', onDelete: 'CASCADE' },
    read_at: ts(),
    created_at: createdAt,
  });
  pgm.addConstraint('announcement_reads', 'announcement_reads_ann_user_unique', {
    unique: ['announcement_id', 'user_id'],
  });

  pgm.createTable('contact_messages', {
    id,
    name: { type: 'text' },
    email_enc: { type: 'text' },
    subject: { type: 'text' },
    body_enc: { type: 'text' },
    status: { type: 'text' },
    created_at: createdAt,
  });

  pgm.createTable('cookie_consents', {
    id,
    user_id: fkUser({ notNull: false }),
    visitor_id: { type: 'text' },
    consent_choices: { type: 'jsonb' },
    consented_at: ts(),
    created_at: createdAt,
  });

  pgm.createTable('changelog_entries', {
    id,
    version: { type: 'text' },
    title: { type: 'text' },
    body: { type: 'text' },
    published_at: ts(),
    created_at: createdAt,
  });

  pgm.createTable('platform_feedback', {
    id,
    user_id: fkUser({ notNull: false }),
    score: { type: 'integer' },
    comment_enc: { type: 'text' },
    created_at: createdAt,
  });

  pgm.createTable('aml_alerts', {
    id,
    user_id: fkUser({ notNull: false }),
    deal_id: fkDeal(),
    pattern_type: { type: 'text' },
    severity: { type: 'text' },
    details: { type: 'text' },
    status: { type: 'text' },
    created_at: createdAt,
  });

  pgm.createTable('break_glass_events', {
    id,
    actor_label: { type: 'text' },
    action: { type: 'text' },
    reason: { type: 'text' },
    created_at: createdAt,
  });

  pgm.createTable('user_presence', {
    id,
    user_id: {
      type: 'uuid',
      notNull: true,
      unique: true,
      references: 'users',
      onDelete: 'CASCADE',
    },
    is_online: { type: 'boolean', notNull: true, default: false },
    last_seen_at: ts(),
    created_at: createdAt,
  });

  pgm.createTable('pinned_items', {
    id,
    user_id: { type: 'uuid', notNull: true, references: 'users', onDelete: 'CASCADE' },
    item_type: { type: 'text' },
    item_id: { type: 'uuid' },
    created_at: createdAt,
  });
  pgm.addConstraint('pinned_items', 'pinned_items_user_type_item_unique', {
    unique: ['user_id', 'item_type', 'item_id'],
  });

  pgm.createTable('login_attempts', {
    id,
    identifier_hash: { type: 'text' },
    ip: { type: 'text' },
    success: { type: 'boolean', notNull: true, default: false },
    created_at: createdAt,
  });

  pgm.createTable('account_lockouts', {
    id,
    user_id: fkUser({ notNull: false }),
    identifier_hash: { type: 'text' },
    reason: { type: 'text' },
    locked_until: ts(),
    created_at: createdAt,
  });

  pgm.createTable('deal_tags', {
    id,
    user_id: { type: 'uuid', notNull: true, references: 'users', onDelete: 'CASCADE' },
    deal_id: { type: 'uuid', notNull: true, references: 'deals', onDelete: 'CASCADE' },
    label: { type: 'text', notNull: true },
    created_at: createdAt,
  });
  pgm.addConstraint('deal_tags', 'deal_tags_user_deal_label_unique', {
    unique: ['user_id', 'deal_id', 'label'],
  });

  pgm.createTable('deal_user_notes', {
    id,
    user_id: { type: 'uuid', notNull: true, references: 'users', onDelete: 'CASCADE' },
    deal_id: { type: 'uuid', notNull: true, references: 'deals', onDelete: 'CASCADE' },
    note_enc: { type: 'text' },
    updated_at: ts(),
    created_at: createdAt,
  });

  pgm.createTable('deal_satisfaction_ratings', {
    id,
    deal_id: { type: 'uuid', notNull: true, references: 'deals', onDelete: 'CASCADE' },
    user_id: { type: 'uuid', notNull: true, references: 'users', onDelete: 'CASCADE' },
    score: { type: 'integer' },
    comment_enc: { type: 'text' },
    created_at: createdAt,
  });
  pgm.addConstraint('deal_satisfaction_ratings', 'deal_satisfaction_ratings_deal_user_unique', {
    unique: ['deal_id', 'user_id'],
  });

  pgm.createTable('referrals', {
    id,
    referrer_user_id: { type: 'uuid', notNull: true, references: 'users', onDelete: 'CASCADE' },
    invited_email_hash: { type: 'text' },
    code: { type: 'text', notNull: true, unique: true },
    status: { type: 'text' },
    created_at: createdAt,
  });

  pgm.createTable('fx_price_snapshots', {
    id,
    coin: { type: 'text' },
    fiat: { type: 'text' },
    rate: { type: 'numeric' },
    source: { type: 'text' },
    source_rank: { type: 'integer' },
    is_stale: { type: 'boolean', notNull: true, default: false },
    fetched_at: ts(),
    created_at: createdAt,
  });
  pgm.createIndex('fx_price_snapshots', ['coin', 'fiat', 'fetched_at']);

  pgm.createTable('policy_versions', {
    id,
    doc_type: { type: 'text', notNull: true },
    version: { type: 'text', notNull: true },
    summary: { type: 'text' },
    content_hash: { type: 'text' },
    published_at: ts(),
    created_at: createdAt,
  });
  pgm.addConstraint('policy_versions', 'policy_versions_doc_version_unique', {
    unique: ['doc_type', 'version'],
  });

  pgm.createTable('notification_global_settings', {
    id,
    user_id: {
      type: 'uuid',
      notNull: true,
      unique: true,
      references: 'users',
      onDelete: 'CASCADE',
    },
    quiet_hours_start: { type: 'text' },
    quiet_hours_end: { type: 'text' },
    timezone: { type: 'text' },
    digest_frequency: { type: 'text' },
    marketing_opt_out: { type: 'boolean', notNull: true, default: false },
    unsubscribe_token: { type: 'text', unique: true },
    created_at: createdAt,
  });

  pgm.createTable('admin_search_filters', {
    id,
    admin_id: fkUser(),
    name: { type: 'text' },
    filter_config: { type: 'jsonb' },
    created_at: createdAt,
  });

  pgm.createTable('bulk_admin_actions', {
    id,
    admin_id: fkUser(),
    action_type: { type: 'text' },
    target_count: { type: 'integer' },
    reason: { type: 'text' },
    status: { type: 'text' },
    created_at: createdAt,
  });

  pgm.createTable('analytics_snapshots', {
    id,
    snapshot_date: { type: 'date' },
    total_deals: { type: 'integer' },
    active_deals: { type: 'integer' },
    completed_deals: { type: 'integer' },
    disputed_deals: { type: 'integer' },
    refunded_amount: { type: 'bigint' },
    released_amount: { type: 'bigint' },
    avg_completion_time: { type: 'numeric' },
    common_dispute_reason: { type: 'text' },
    payment_issue_count: { type: 'integer' },
    created_at: createdAt,
  });

  pgm.createTable('fraud_analytics_snapshots', {
    id,
    snapshot_date: { type: 'date' },
    repeated_wrong_network_count: { type: 'integer' },
    repeated_dispute_count: { type: 'integer' },
    failed_code_burst_count: { type: 'integer' },
    new_device_wallet_change_count: { type: 'integer' },
    high_risk_wallet_count: { type: 'integer' },
    blocked_user_count: { type: 'integer' },
    created_at: createdAt,
  });

  pgm.createTable('request_error_logs', {
    id,
    request_id: { type: 'text', unique: true },
    user_id: fkUser({ notNull: false }),
    deal_id: fkDeal(),
    error_code: { type: 'text' },
    area: { type: 'text' },
    message: { type: 'text' },
    created_at: createdAt,
  });
  pgm.createIndex('request_error_logs', 'request_id');

  pgm.createTable('user_inactivity_events', {
    id,
    user_id: { type: 'uuid', notNull: true, references: 'users', onDelete: 'CASCADE' },
    deal_id: fkDeal(),
    inactivity_type: { type: 'text' },
    last_seen_at: ts(),
    reminder_sent_at: ts(),
    status: { type: 'text' },
    created_at: createdAt,
  });

  pgm.createTable('deal_limit_rules', {
    id,
    account_label: { type: 'text' },
    max_active_deals: { type: 'integer' },
    max_daily_deals: { type: 'integer' },
    max_open_value_usd: { type: 'bigint' },
    created_at: createdAt,
  });

  pgm.createTable('withdrawal_allowlist', {
    id,
    coin: { type: 'text' },
    network: { type: 'text' },
    address: { type: 'text' },
    label: { type: 'text' },
    added_by: fkUser(),
    added_at: ts(),
    active_from: ts(),
    is_active: { type: 'boolean', notNull: true, default: false },
    created_at: createdAt,
  });

  pgm.createTable('address_screenings', {
    id,
    address: { type: 'text' },
    coin: { type: 'text' },
    network: { type: 'text' },
    result: { type: 'text' },
    source: { type: 'text' },
    checked_at: ts(),
    created_at: createdAt,
  });

  pgm.createTable('push_subscriptions', {
    id,
    user_id: { type: 'uuid', notNull: true, references: 'users', onDelete: 'CASCADE' },
    endpoint: { type: 'text' },
    p256dh_key: { type: 'text' },
    auth_key: { type: 'text' },
    device: { type: 'text' },
    revoked_at: ts(),
    created_at: createdAt,
  });

  pgm.createTable('pii_access_logs', {
    id,
    actor_id: fkUser(),
    target_user_id: fkUser(),
    deal_id: fkDeal(),
    field_type: { type: 'text' },
    reason: { type: 'text' },
    created_at: createdAt,
  });

  pgm.createTable('security_incidents', {
    id,
    title: { type: 'text' },
    severity: { type: 'text' },
    status: { type: 'text' },
    affected_scope: { type: 'text' },
    detected_at: ts(),
    contained_at: ts(),
    users_notified_at: ts(),
    summary_enc: { type: 'text' },
    created_at: createdAt,
  });

  pgm.createTable('deal_drafts', {
    id,
    user_id: { type: 'uuid', notNull: true, references: 'users', onDelete: 'CASCADE' },
    draft_data_enc: { type: 'text' },
    last_step: { type: 'text' },
    updated_at: ts(),
    created_at: createdAt,
  });

  pgm.createTable('chain_reorg_events', {
    id,
    payment_id: { type: 'uuid', references: 'payments', onDelete: 'SET NULL' },
    deal_id: fkDeal(),
    tx_hash: { type: 'text' },
    previous_status: { type: 'text' },
    new_status: { type: 'text' },
    detected_at: ts(),
    resolved_at: ts(),
    created_at: createdAt,
  });
  pgm.createIndex('chain_reorg_events', 'tx_hash');

  pgm.createTable('transaction_retries', {
    id,
    payment_id: { type: 'uuid', references: 'payments', onDelete: 'SET NULL' },
    payout_queue_id: { type: 'uuid', references: 'payout_queue', onDelete: 'SET NULL' },
    deal_id: { type: 'uuid', notNull: true, references: 'deals', onDelete: 'CASCADE' },
    reason: { type: 'text' },
    action: { type: 'text' },
    old_tx_hash: { type: 'text' },
    new_tx_hash: { type: 'text' },
    status: { type: 'text' },
    created_at: createdAt,
  });

  pgm.createTable('address_poisoning_alerts', {
    id,
    user_id: fkUser({ notNull: false }),
    deal_id: fkDeal(),
    suspected_address: { type: 'text' },
    real_address: { type: 'text' },
    source_tx_hash: { type: 'text' },
    created_at: createdAt,
  });

  pgm.createTable('operator_payout_limits', {
    id,
    coin: { type: 'text', notNull: true },
    network: { type: 'text', notNull: true },
    daily_cap: { type: 'bigint' },
    window_start: ts(),
    used_today: { type: 'bigint', notNull: true, default: 0 },
    created_at: createdAt,
  });
  pgm.addConstraint('operator_payout_limits', 'operator_payout_limits_coin_network_unique', {
    unique: ['coin', 'network'],
  });

  pgm.createTable('hot_wallet_sweeps', {
    id,
    coin: { type: 'text' },
    network: { type: 'text' },
    amount_smallest_unit: { type: 'bigint' },
    threshold: { type: 'bigint' },
    from_hot_address: { type: 'text' },
    to_cold_address: { type: 'text' },
    tx_hash: { type: 'text' },
    swept_at: ts(),
    created_at: createdAt,
  });

  pgm.createTable('step_up_confirmations', {
    id,
    user_id: { type: 'uuid', notNull: true, references: 'users', onDelete: 'CASCADE' },
    action_type: { type: 'text' },
    deal_id: fkDeal(),
    token_hash: { type: 'text' },
    expires_at: ts(),
    confirmed_at: ts(),
    created_at: createdAt,
  });

  pgm.createTable('security_reports', {
    id,
    reporter_contact_enc: { type: 'text' },
    summary_enc: { type: 'text' },
    severity: { type: 'text' },
    status: { type: 'text' },
    created_at: createdAt,
  });

  pgm.createTable('service_hours', {
    id,
    day_of_week: { type: 'integer' },
    open_time: { type: 'text' },
    close_time: { type: 'text' },
    timezone: { type: 'text' },
    created_at: createdAt,
  });

  pgm.createTable('service_holidays', {
    id,
    holiday_date: { type: 'date' },
    label: { type: 'text' },
    created_at: createdAt,
  });
};

/** @param {MigrationBuilder} pgm */
exports.down = (pgm) => {
  const tables = [
    'service_holidays',
    'service_hours',
    'security_reports',
    'step_up_confirmations',
    'hot_wallet_sweeps',
    'operator_payout_limits',
    'address_poisoning_alerts',
    'transaction_retries',
    'chain_reorg_events',
    'deal_drafts',
    'security_incidents',
    'pii_access_logs',
    'push_subscriptions',
    'address_screenings',
    'withdrawal_allowlist',
    'deal_limit_rules',
    'user_inactivity_events',
    'request_error_logs',
    'fraud_analytics_snapshots',
    'analytics_snapshots',
    'bulk_admin_actions',
    'admin_search_filters',
    'notification_global_settings',
    'policy_versions',
    'fx_price_snapshots',
    'referrals',
    'deal_satisfaction_ratings',
    'deal_user_notes',
    'deal_tags',
    'account_lockouts',
    'login_attempts',
    'pinned_items',
    'user_presence',
    'break_glass_events',
    'aml_alerts',
    'platform_feedback',
    'changelog_entries',
    'cookie_consents',
    'contact_messages',
    'announcement_reads',
    'announcements',
    'user_preferences',
    'support_sla_rules',
    'empty_state_guides',
    'data_exports',
    'onboarding_tasks',
    'email_domain_checks',
    'guided_help_steps',
    'guided_help_flows',
    'notification_deliveries',
    'transaction_history_events',
    'account_deactivations',
    'account_deletions',
    'account_deletion_requests',
    'user_blocks',
    'user_reports',
    'support_tickets',
    'admin_notes',
    'admin_overrides',
    'admin_actions',
    'invoices',
    'deal_legal_acceptances',
    'terms_acceptances',
    'password_change_events',
    'email_change_requests',
    'account_security_events',
    'revoked_tokens',
    'auth_tokens',
    'user_sessions',
    'wallet_validation_checks',
    'address_book',
    'invite_safety_snapshots',
    'deal_invites',
  ];
  for (const t of tables) pgm.dropTable(t);
};
