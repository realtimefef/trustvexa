/* eslint-disable */
/**
 * Deals table group migration (task 2.2).
 *
 * Creates the §16 "Deals" 3NF tables exactly as listed in the design's
 * Data Models -> Deals table, in dependency order (parents before children):
 *   products, deal_templates, deal_template_checklist_items,
 *   deal_template_evidence_rules, deals (immutable funding snapshots +
 *   version_no), deal_terms, deal_amendments, deal_cancellations,
 *   deal_milestones, escrow_addresses, payments (unique (tx_hash, output_index)),
 *   payment_status_events, refund_status_events, payout_queue (version_no),
 *   settlements, escrow_logs (hash-chain columns), deal_holds,
 *   deal_activity_events, deal_documents (unique document_number),
 *   deal_deadlines, deadline_reminders, buyer_acceptance_checklists,
 *   seller_handover_proofs, disputes, dispute_threads, dispute_thread_messages,
 *   dispute_evidence, verification_codes, risk_flags, user_warning_notices,
 *   wallet_change_requests.
 *
 * Also closes the cross-group FK deferred by task 2.1:
 *   trust_events.deal_id -> deals(id)  (added here now that `deals` exists).
 *
 * ── Conventions (inherited from task 2.1) ──
 *   - uuid PKs default gen_random_uuid(); FKs are uuid -> parent.id.
 *   - timestamptz timestamps; created_at defaults now().
 *   - Money is stored as integer smallest units in `*_smallest_unit` / fee /
 *     total columns (bigint). Display-only coin/USD figures use numeric/text.
 *     No floating-point is used for any money column. *(Requirements 17.1)*
 *   - deal_status enum reproduces the §4 state-machine states exactly; status
 *     fields whose value sets the design does NOT enumerate stay `text`.
 *
 * ── Cross-group FK deferred forward ──
 *   - payments.token_contract_id references `token_contract_allowlist`, created
 *     in a LATER migration group (task 2.6). The column is created here WITHOUT
 *     an inline FK; the constraint is added in that later migration.
 *
 * Migration tool: node-pg-migrate (CommonJS, `DATABASE_URL`). *(Requirements 43.7, 16, 17.1, 17.9, 43.4)*
 *
 * @typedef {import('node-pg-migrate').MigrationBuilder} MigrationBuilder
 */

exports.shorthands = undefined;

/**
 * Apply the Deals table group.
 *
 * @param {MigrationBuilder} pgm
 */
exports.up = (pgm) => {
  // ── Enumerated value sets (only where the design enumerates them) ────────
  // products.type / deal_templates.type
  pgm.createType('product_type', ['digital', 'account']);
  // deals.network_mode
  pgm.createType('network_mode', ['mainnet', 'testnet']);
  // deals.fee_payer
  pgm.createType('fee_payer', ['buyer', 'seller', 'split']);
  // deals.status — exact §4 state-machine states (authoritative allow-list).
  pgm.createType('deal_status', [
    'Created',
    'Invited',
    'Agreed',
    'Verified',
    'Confirmed',
    'Amended',
    'Cancelled',
    'Funded',
    'SellerHandover',
    'MiddlemanVerified',
    'Delivered',
    'Approved',
    'PayoutQueued',
    'MilestoneReleased',
    'Released',
    'Disputed',
    'Refunded',
    'PartiallySettled',
    'Expired',
    'Paused',
  ]);
  // payments.direction
  pgm.createType('payment_direction', ['in', 'out']);
  // payments.match_status
  pgm.createType('match_status', [
    'matched',
    'underpaid',
    'overpaid',
    'wrong_network',
    'wrong_coin',
    'fake_token',
  ]);
  // payout_queue.status
  pgm.createType('payout_status', ['pending', 'approved', 'broadcast', 'confirmed', 'cancelled']);
  // settlements.type
  pgm.createType('settlement_type', ['full_refund', 'full_release', 'partial_split']);
  // escrow_logs.visibility
  pgm.createType('escrow_log_visibility', ['user', 'middleman_only']);
  // deal_deadlines.deadline_type
  pgm.createType('deadline_type', [
    'funding',
    'completion',
    'inspection',
    'payout_pending',
    'dispute_response',
  ]);
  // dispute_threads.status
  pgm.createType('dispute_thread_status', ['open', 'locked']);
  // dispute_thread_messages.role
  pgm.createType('dispute_party_role', ['buyer', 'seller', 'middleman']);
  // wallet_change_requests.wallet_type
  pgm.createType('wallet_change_type', ['refund', 'payout']);

  // ── products ─────────────────────────────────────────────────────────────
  pgm.createTable('products', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    seller_id: { type: 'uuid', notNull: true, references: 'users', onDelete: 'RESTRICT' },
    title: { type: 'text', notNull: true },
    description: { type: 'text' },
    type: { type: 'product_type', notNull: true },
    // USD price in integer cents (display/listing reference; deal snapshots are authoritative).
    price_smallest_unit: { type: 'bigint' },
    status: { type: 'text' },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
  });
  pgm.createIndex('products', 'seller_id');

  // ── deal_templates ─────────────────────────────────────────────────────────
  pgm.createTable('deal_templates', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    name: { type: 'text', notNull: true },
    type: { type: 'product_type' },
    default_inspection_window: { type: 'integer' },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
  });

  // ── deal_template_checklist_items ───────────────────────────────────────────
  pgm.createTable('deal_template_checklist_items', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    template_id: { type: 'uuid', notNull: true, references: 'deal_templates', onDelete: 'CASCADE' },
    item_key: { type: 'text', notNull: true },
    label: { type: 'text' },
    required: { type: 'boolean', notNull: true, default: false },
    sort_order: { type: 'integer' },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
  });
  pgm.createIndex('deal_template_checklist_items', 'template_id');

  // ── deal_template_evidence_rules ────────────────────────────────────────────
  pgm.createTable('deal_template_evidence_rules', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    template_id: { type: 'uuid', notNull: true, references: 'deal_templates', onDelete: 'CASCADE' },
    evidence_type: { type: 'text', notNull: true },
    label: { type: 'text' },
    required: { type: 'boolean', notNull: true, default: false },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
  });
  pgm.createIndex('deal_template_evidence_rules', 'template_id');

  // ── deals ────────────────────────────────────────────────────────────────
  // Money figures below are immutable point-in-time snapshots locked at funding
  // (Requirements 17.9, 21.1). *_smallest_unit / fee / total columns are integer
  // smallest units (bigint). locked_fx_rate / price_tolerance_pct are numeric
  // (rate metadata, not money). amount_coin is a display string.
  pgm.createTable('deals', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    buyer_id: { type: 'uuid', references: 'users', onDelete: 'RESTRICT' },
    seller_id: { type: 'uuid', references: 'users', onDelete: 'RESTRICT' },
    middleman_id: { type: 'uuid', references: 'users', onDelete: 'RESTRICT' },
    product_id: { type: 'uuid', references: 'products', onDelete: 'RESTRICT' },
    template_id: { type: 'uuid', references: 'deal_templates', onDelete: 'RESTRICT' },
    coin: { type: 'text', notNull: true },
    network: { type: 'text', notNull: true },
    network_mode: { type: 'network_mode', notNull: true, default: 'mainnet' },
    is_practice: { type: 'boolean', notNull: true, default: false },
    // ── immutable funding snapshots ──
    deal_amount: { type: 'bigint' }, // USD value in integer cents
    amount_coin: { type: 'text' }, // display amount in coin units
    amount_smallest_unit: { type: 'bigint' },
    locked_fx_rate: { type: 'numeric' },
    fx_source: { type: 'text' },
    price_tolerance_pct: { type: 'numeric' },
    fee_payer: { type: 'fee_payer' },
    platform_fee: { type: 'bigint' },
    seller_settlement_fee: { type: 'bigint' },
    transaction_fee: { type: 'bigint' },
    buyer_total: { type: 'bigint' },
    seller_payout: { type: 'bigint' },
    // ── lifecycle ──
    status: { type: 'deal_status', notNull: true, default: 'Created' },
    hold_status: { type: 'text' },
    legal_hold: { type: 'boolean', notNull: true, default: false },
    attempt_no: { type: 'integer', notNull: true, default: 1 },
    risk_score: { type: 'integer' },
    mm_contacted_at: { type: 'timestamptz' },
    fund_by: { type: 'timestamptz' },
    complete_by: { type: 'timestamptz' },
    inspection_until: { type: 'timestamptz' },
    last_activity_at: { type: 'timestamptz' },
    // optimistic-locking counter (Requirements 17.11)
    version_no: { type: 'integer', notNull: true, default: 0 },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
    updated_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
  });
  pgm.createIndex('deals', 'status');
  pgm.createIndex('deals', 'created_at');
  pgm.createIndex('deals', 'risk_score');
  pgm.createIndex('deals', 'hold_status');
  pgm.createIndex('deals', 'fund_by');
  pgm.createIndex('deals', 'complete_by');
  pgm.createIndex('deals', 'inspection_until');
  pgm.createIndex('deals', 'buyer_id');
  pgm.createIndex('deals', 'seller_id');
  pgm.createIndex('deals', 'middleman_id');
  pgm.createIndex('deals', 'product_id');
  pgm.createIndex('deals', 'template_id');

  // Close the cross-group FK deferred by task 2.1 now that `deals` exists.
  pgm.addConstraint('trust_events', 'trust_events_deal_id_fkey', {
    foreignKeys: { columns: 'deal_id', references: 'deals(id)', onDelete: 'SET NULL' },
  });
  pgm.createIndex('trust_events', 'deal_id');

  // ── deal_terms ──────────────────────────────────────────────────────────────
  pgm.createTable('deal_terms', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    deal_id: { type: 'uuid', notNull: true, references: 'deals', onDelete: 'CASCADE' },
    version: { type: 'integer', notNull: true, default: 1 },
    terms_snapshot: { type: 'text' },
    accepted_by_buyer_at: { type: 'timestamptz' },
    accepted_by_seller_at: { type: 'timestamptz' },
    accepted_by_middleman_at: { type: 'timestamptz' },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
  });
  pgm.createIndex('deal_terms', 'deal_id');

  // ── deal_amendments ─────────────────────────────────────────────────────────
  pgm.createTable('deal_amendments', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    deal_id: { type: 'uuid', notNull: true, references: 'deals', onDelete: 'CASCADE' },
    requested_by: { type: 'uuid', references: 'users', onDelete: 'SET NULL' },
    change_type: { type: 'text' },
    old_value: { type: 'text' },
    new_value: { type: 'text' },
    buyer_approved_at: { type: 'timestamptz' },
    seller_approved_at: { type: 'timestamptz' },
    middleman_approved_at: { type: 'timestamptz' },
    status: { type: 'text' },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
  });
  pgm.createIndex('deal_amendments', 'deal_id');

  // ── deal_cancellations ──────────────────────────────────────────────────────
  pgm.createTable('deal_cancellations', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    deal_id: { type: 'uuid', notNull: true, references: 'deals', onDelete: 'CASCADE' },
    requested_by: { type: 'uuid', references: 'users', onDelete: 'SET NULL' },
    buyer_approved_at: { type: 'timestamptz' },
    seller_approved_at: { type: 'timestamptz' },
    middleman_decision: { type: 'text' },
    reason: { type: 'text' },
    status: { type: 'text' },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
  });
  pgm.createIndex('deal_cancellations', 'deal_id');

  // ── deal_milestones ─────────────────────────────────────────────────────────
  pgm.createTable('deal_milestones', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    deal_id: { type: 'uuid', notNull: true, references: 'deals', onDelete: 'CASCADE' },
    title: { type: 'text' },
    description: { type: 'text' },
    amount_smallest_unit: { type: 'bigint' },
    status: { type: 'text' },
    approved_at: { type: 'timestamptz' },
    released_at: { type: 'timestamptz' },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
  });
  pgm.createIndex('deal_milestones', 'deal_id');

  // ── escrow_addresses ────────────────────────────────────────────────────────
  pgm.createTable('escrow_addresses', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    deal_id: { type: 'uuid', notNull: true, references: 'deals', onDelete: 'RESTRICT' },
    coin: { type: 'text', notNull: true },
    network: { type: 'text', notNull: true },
    address: { type: 'text', notNull: true },
    derivation_index: { type: 'integer' },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
  });
  pgm.createIndex('escrow_addresses', 'deal_id');

  // ── payments ────────────────────────────────────────────────────────────────
  // token_contract_id references token_contract_allowlist (created in task 2.6);
  // the FK constraint is added in that later migration. Unique (tx_hash,
  // output_index) prevents a re-seen transaction from double-crediting
  // (Requirements 45.7, 17.13).
  pgm.createTable('payments', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    deal_id: { type: 'uuid', notNull: true, references: 'deals', onDelete: 'RESTRICT' },
    coin: { type: 'text', notNull: true },
    network: { type: 'text', notNull: true },
    token_contract_id: { type: 'uuid' },
    tx_hash: { type: 'text' },
    output_index: { type: 'integer', notNull: true, default: 0 },
    amount_coin: { type: 'text' },
    amount_smallest_unit: { type: 'bigint' },
    confirmations: { type: 'integer', notNull: true, default: 0 },
    direction: { type: 'payment_direction', notNull: true },
    match_status: { type: 'match_status' },
    status: { type: 'text' },
    explorer_url: { type: 'text' },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
  });
  pgm.addConstraint('payments', 'payments_txhash_output_unique', {
    unique: ['tx_hash', 'output_index'],
  });
  pgm.createIndex('payments', 'deal_id');
  pgm.createIndex('payments', 'tx_hash');
  pgm.createIndex('payments', 'status');

  // ── payment_status_events ───────────────────────────────────────────────────
  pgm.createTable('payment_status_events', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    deal_id: { type: 'uuid', notNull: true, references: 'deals', onDelete: 'CASCADE' },
    payment_id: { type: 'uuid', references: 'payments', onDelete: 'SET NULL' },
    status_step: { type: 'text' },
    message: { type: 'text' },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
  });
  pgm.createIndex('payment_status_events', 'deal_id');

  // ── refund_status_events ────────────────────────────────────────────────────
  pgm.createTable('refund_status_events', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    deal_id: { type: 'uuid', notNull: true, references: 'deals', onDelete: 'CASCADE' },
    payment_id: { type: 'uuid', references: 'payments', onDelete: 'SET NULL' },
    status_step: { type: 'text' },
    message: { type: 'text' },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
  });
  pgm.createIndex('refund_status_events', 'deal_id');

  // ── payout_queue ────────────────────────────────────────────────────────────
  pgm.createTable('payout_queue', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    deal_id: { type: 'uuid', notNull: true, references: 'deals', onDelete: 'RESTRICT' },
    payee_id: { type: 'uuid', references: 'users', onDelete: 'RESTRICT' },
    coin: { type: 'text', notNull: true },
    network: { type: 'text', notNull: true },
    address: { type: 'text' },
    amount_coin: { type: 'text' },
    amount_smallest_unit: { type: 'bigint' },
    preflight_status: { type: 'text' },
    preflight_checked_at: { type: 'timestamptz' },
    gas_reserve_status: { type: 'text' },
    status: { type: 'payout_status', notNull: true, default: 'pending' },
    hold_until: { type: 'timestamptz' },
    tx_hash: { type: 'text' },
    version_no: { type: 'integer', notNull: true, default: 0 },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
  });
  pgm.createIndex('payout_queue', 'deal_id');
  pgm.createIndex('payout_queue', 'status');

  // ── settlements ─────────────────────────────────────────────────────────────
  pgm.createTable('settlements', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    deal_id: { type: 'uuid', notNull: true, references: 'deals', onDelete: 'RESTRICT' },
    type: { type: 'settlement_type', notNull: true },
    buyer_refund_amount: { type: 'bigint' },
    seller_release_amount: { type: 'bigint' },
    reason: { type: 'text' },
    decided_by: { type: 'uuid', references: 'users', onDelete: 'SET NULL' },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
  });
  pgm.createIndex('settlements', 'deal_id');

  // ── escrow_logs (hash-chained, immutable) ───────────────────────────────────
  pgm.createTable('escrow_logs', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    deal_id: { type: 'uuid', notNull: true, references: 'deals', onDelete: 'RESTRICT' },
    action: { type: 'text', notNull: true },
    from_state: { type: 'text' },
    to_state: { type: 'text' },
    actor_id: { type: 'uuid', references: 'users', onDelete: 'SET NULL' },
    visibility: { type: 'escrow_log_visibility', notNull: true, default: 'middleman_only' },
    request_id: { type: 'text' },
    metadata: { type: 'jsonb' },
    prev_hash: { type: 'text' },
    entry_hash: { type: 'text' },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
  });
  pgm.createIndex('escrow_logs', 'deal_id');
  pgm.createIndex('escrow_logs', 'request_id');

  // ── deal_holds ──────────────────────────────────────────────────────────────
  pgm.createTable('deal_holds', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    deal_id: { type: 'uuid', notNull: true, references: 'deals', onDelete: 'CASCADE' },
    hold_type: { type: 'text' },
    reason: { type: 'text' },
    visible_message: { type: 'text' },
    user_next_action: { type: 'text' },
    estimated_next_step_at: { type: 'timestamptz' },
    started_by: { type: 'uuid', references: 'users', onDelete: 'SET NULL' },
    released_by: { type: 'uuid', references: 'users', onDelete: 'SET NULL' },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
  });
  pgm.createIndex('deal_holds', 'deal_id');

  // ── deal_activity_events ────────────────────────────────────────────────────
  pgm.createTable('deal_activity_events', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    deal_id: { type: 'uuid', notNull: true, references: 'deals', onDelete: 'CASCADE' },
    user_id: { type: 'uuid', references: 'users', onDelete: 'SET NULL' },
    event_type: { type: 'text' },
    title: { type: 'text' },
    visible_to_user: { type: 'boolean', notNull: true, default: true },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
  });
  pgm.createIndex('deal_activity_events', 'deal_id');

  // ── deal_documents (unique document_number) ─────────────────────────────────
  pgm.createTable('deal_documents', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    deal_id: { type: 'uuid', notNull: true, references: 'deals', onDelete: 'RESTRICT' },
    document_type: { type: 'text' },
    document_number: { type: 'text', unique: true },
    file_key: { type: 'text' },
    created_by: { type: 'uuid', references: 'users', onDelete: 'SET NULL' },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
  });
  pgm.createIndex('deal_documents', 'deal_id');

  // ── deal_deadlines ──────────────────────────────────────────────────────────
  pgm.createTable('deal_deadlines', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    deal_id: { type: 'uuid', notNull: true, references: 'deals', onDelete: 'CASCADE' },
    deadline_type: { type: 'deadline_type', notNull: true },
    deadline_at: { type: 'timestamptz' },
    status: { type: 'text' },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
  });
  pgm.createIndex('deal_deadlines', 'deal_id');
  pgm.createIndex('deal_deadlines', 'deadline_at');

  // ── deadline_reminders ──────────────────────────────────────────────────────
  pgm.createTable('deadline_reminders', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    deadline_id: { type: 'uuid', notNull: true, references: 'deal_deadlines', onDelete: 'CASCADE' },
    reminder_type: { type: 'text' },
    send_at: { type: 'timestamptz' },
    sent_at: { type: 'timestamptz' },
    status: { type: 'text' },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
  });
  pgm.createIndex('deadline_reminders', 'deadline_id');

  // ── buyer_acceptance_checklists ─────────────────────────────────────────────
  pgm.createTable('buyer_acceptance_checklists', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    deal_id: { type: 'uuid', notNull: true, references: 'deals', onDelete: 'CASCADE' },
    item_key: { type: 'text', notNull: true },
    checked_by: { type: 'uuid', references: 'users', onDelete: 'SET NULL' },
    checked_at: { type: 'timestamptz' },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
  });
  pgm.createIndex('buyer_acceptance_checklists', 'deal_id');

  // ── seller_handover_proofs ──────────────────────────────────────────────────
  pgm.createTable('seller_handover_proofs', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    deal_id: { type: 'uuid', notNull: true, references: 'deals', onDelete: 'CASCADE' },
    item_key: { type: 'text', notNull: true },
    proof_note_enc: { type: 'text' },
    checked_by: { type: 'uuid', references: 'users', onDelete: 'SET NULL' },
    checked_at: { type: 'timestamptz' },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
  });
  pgm.createIndex('seller_handover_proofs', 'deal_id');

  // ── disputes ────────────────────────────────────────────────────────────────
  pgm.createTable('disputes', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    deal_id: { type: 'uuid', notNull: true, references: 'deals', onDelete: 'RESTRICT' },
    raised_by: { type: 'uuid', references: 'users', onDelete: 'SET NULL' },
    reason: { type: 'text' },
    status: { type: 'text' },
    resolution: { type: 'text' },
    final_decision_note: { type: 'text' },
    decision_pdf_key: { type: 'text' },
    resolved_at: { type: 'timestamptz' },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
  });
  pgm.createIndex('disputes', 'deal_id');
  pgm.createIndex('disputes', 'status');

  // ── dispute_threads ─────────────────────────────────────────────────────────
  pgm.createTable('dispute_threads', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    dispute_id: { type: 'uuid', notNull: true, references: 'disputes', onDelete: 'CASCADE' },
    status: { type: 'dispute_thread_status', notNull: true, default: 'open' },
    locked_at: { type: 'timestamptz' },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
  });
  pgm.createIndex('dispute_threads', 'dispute_id');

  // ── dispute_thread_messages ─────────────────────────────────────────────────
  pgm.createTable('dispute_thread_messages', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    thread_id: { type: 'uuid', notNull: true, references: 'dispute_threads', onDelete: 'CASCADE' },
    sender_id: { type: 'uuid', references: 'users', onDelete: 'SET NULL' },
    body_enc: { type: 'text' },
    role: { type: 'dispute_party_role' },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
  });
  pgm.createIndex('dispute_thread_messages', 'thread_id');

  // ── dispute_evidence (hash + lock at upload) ────────────────────────────────
  pgm.createTable('dispute_evidence', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    dispute_id: { type: 'uuid', notNull: true, references: 'disputes', onDelete: 'RESTRICT' },
    file_key: { type: 'text' },
    file_hash: { type: 'text' },
    mime_type: { type: 'text' },
    uploaded_by: { type: 'uuid', references: 'users', onDelete: 'SET NULL' },
    review_status: { type: 'text' },
    reviewed_by: { type: 'uuid', references: 'users', onDelete: 'SET NULL' },
    locked_at: { type: 'timestamptz' },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
  });
  pgm.createIndex('dispute_evidence', 'dispute_id');

  // ── verification_codes (48-digit code hashed, single-use) ───────────────────
  pgm.createTable('verification_codes', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    deal_id: { type: 'uuid', notNull: true, references: 'deals', onDelete: 'CASCADE' },
    code_hash: { type: 'text', notNull: true },
    expires_at: { type: 'timestamptz' },
    verified_at: { type: 'timestamptz' },
    attempts: { type: 'integer', notNull: true, default: 0 },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
  });
  pgm.createIndex('verification_codes', 'deal_id');

  // ── risk_flags ──────────────────────────────────────────────────────────────
  pgm.createTable('risk_flags', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    deal_id: { type: 'uuid', references: 'deals', onDelete: 'CASCADE' },
    user_id: { type: 'uuid', references: 'users', onDelete: 'SET NULL' },
    flag_type: { type: 'text' },
    severity: { type: 'text' },
    details: { type: 'text' },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
  });
  pgm.createIndex('risk_flags', 'deal_id');
  pgm.createIndex('risk_flags', 'user_id');

  // ── user_warning_notices ────────────────────────────────────────────────────
  pgm.createTable('user_warning_notices', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    user_id: { type: 'uuid', notNull: true, references: 'users', onDelete: 'CASCADE' },
    warning_type: { type: 'text' },
    deal_id: { type: 'uuid', references: 'deals', onDelete: 'SET NULL' },
    message: { type: 'text' },
    acknowledged_at: { type: 'timestamptz' },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
  });
  pgm.createIndex('user_warning_notices', 'user_id');

  // ── wallet_change_requests ──────────────────────────────────────────────────
  pgm.createTable('wallet_change_requests', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    user_id: { type: 'uuid', notNull: true, references: 'users', onDelete: 'CASCADE' },
    deal_id: { type: 'uuid', references: 'deals', onDelete: 'SET NULL' },
    wallet_type: { type: 'wallet_change_type', notNull: true },
    old_address_enc: { type: 'text' },
    new_address_enc: { type: 'text' },
    status: { type: 'text' },
    hold_until: { type: 'timestamptz' },
    confirmed_at: { type: 'timestamptz' },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
  });
  pgm.createIndex('wallet_change_requests', 'user_id');
};

/**
 * Revert the Deals table group. Drops children before parents (reverse
 * dependency order), removes the trust_events.deal_id FK re-added here, then
 * drops the enum types. pgcrypto is left in place (owned by task 2.1).
 *
 * @param {MigrationBuilder} pgm
 */
exports.down = (pgm) => {
  pgm.dropTable('wallet_change_requests');
  pgm.dropTable('user_warning_notices');
  pgm.dropTable('risk_flags');
  pgm.dropTable('verification_codes');
  pgm.dropTable('dispute_evidence');
  pgm.dropTable('dispute_thread_messages');
  pgm.dropTable('dispute_threads');
  pgm.dropTable('disputes');
  pgm.dropTable('seller_handover_proofs');
  pgm.dropTable('buyer_acceptance_checklists');
  pgm.dropTable('deadline_reminders');
  pgm.dropTable('deal_deadlines');
  pgm.dropTable('deal_documents');
  pgm.dropTable('deal_activity_events');
  pgm.dropTable('deal_holds');
  pgm.dropTable('escrow_logs');
  pgm.dropTable('settlements');
  pgm.dropTable('payout_queue');
  pgm.dropTable('refund_status_events');
  pgm.dropTable('payment_status_events');
  pgm.dropTable('payments');
  pgm.dropTable('escrow_addresses');
  pgm.dropTable('deal_milestones');
  pgm.dropTable('deal_cancellations');
  pgm.dropTable('deal_amendments');
  pgm.dropTable('deal_terms');

  // Remove the FK + index re-added on the task-2.1 table before dropping deals.
  pgm.dropIndex('trust_events', 'deal_id');
  pgm.dropConstraint('trust_events', 'trust_events_deal_id_fkey');

  pgm.dropTable('deals');
  pgm.dropTable('deal_template_evidence_rules');
  pgm.dropTable('deal_template_checklist_items');
  pgm.dropTable('deal_templates');
  pgm.dropTable('products');

  pgm.dropType('wallet_change_type');
  pgm.dropType('dispute_party_role');
  pgm.dropType('dispute_thread_status');
  pgm.dropType('deadline_type');
  pgm.dropType('escrow_log_visibility');
  pgm.dropType('settlement_type');
  pgm.dropType('payout_status');
  pgm.dropType('match_status');
  pgm.dropType('payment_direction');
  pgm.dropType('deal_status');
  pgm.dropType('fee_payer');
  pgm.dropType('network_mode');
  pgm.dropType('product_type');
};
