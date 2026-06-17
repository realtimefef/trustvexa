/* eslint-disable */
/**
 * Chat & handover table group migration (task 2.3).
 *
 * Creates the §16 "Chat & handover" tables exactly as listed in the design:
 *   chats, messages, message_attachments, message_reactions
 *   (unique (message_id, user_id, emoji)), message_mentions, message_edits,
 *   message_drafts (unique (chat_id, user_id)), message_receipts
 *   (unique (message_id, user_id)), conversation_settings
 *   (unique (chat_id, user_id)), file_access_links, file_preview_events,
 *   important_read_receipts, handover_items, handover_vault_items,
 *   handover_access_logs.
 *
 * Conventions inherited from tasks 2.1/2.2 (uuid PK gen_random_uuid(),
 * timestamptz + created_at default now(), uuid FKs). Encrypted payloads use
 * `*_enc` columns (envelope encryption wired in task 2.9). *(Requirements 43.7, 27, 29, 40, 43.4)*
 *
 * @typedef {import('node-pg-migrate').MigrationBuilder} MigrationBuilder
 */

exports.shorthands = undefined;

/** @param {MigrationBuilder} pgm */
exports.up = (pgm) => {
  pgm.createType('chat_type', ['buyer_seller', 'buyer_mm', 'seller_mm', 'handover_mm']);
  pgm.createType('chat_status', ['open', 'closed', 'deleted_by_admin']);
  pgm.createType('attachment_kind', ['image', 'video', 'voice', 'document']);
  pgm.createType('attachment_scan_status', ['pending', 'clean', 'quarantined', 'blocked']);
  pgm.createType('file_preview_action', ['preview', 'download']);
  pgm.createType('handover_item_type', ['account', 'digital_product']);
  pgm.createType('handover_reveal_status', ['middleman_only', 'revealed_to_buyer', 'revoked']);
  pgm.createType('handover_secret_type', ['login', 'recovery', 'file_link', 'note']);
  pgm.createType('handover_access_type', ['view', 'reveal', 'download']);

  pgm.createTable('chats', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    deal_id: { type: 'uuid', notNull: true, references: 'deals', onDelete: 'CASCADE' },
    type: { type: 'chat_type', notNull: true },
    status: { type: 'chat_status', notNull: true, default: 'open' },
    admin_deleted_at: { type: 'timestamptz' },
    purge_at: { type: 'timestamptz' },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
  });
  pgm.createIndex('chats', 'deal_id');

  pgm.createTable('messages', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    chat_id: { type: 'uuid', notNull: true, references: 'chats', onDelete: 'CASCADE' },
    sender_id: { type: 'uuid', references: 'users', onDelete: 'SET NULL' },
    body_enc: { type: 'text' },
    reply_to_message_id: { type: 'uuid', references: 'messages', onDelete: 'SET NULL' },
    forwarded_from_message_id: { type: 'uuid', references: 'messages', onDelete: 'SET NULL' },
    is_edited: { type: 'boolean', notNull: true, default: false },
    edited_at: { type: 'timestamptz' },
    is_deleted: { type: 'boolean', notNull: true, default: false },
    deleted_by: { type: 'uuid', references: 'users', onDelete: 'SET NULL' },
    admin_deleted_at: { type: 'timestamptz' },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
  });
  pgm.createIndex('messages', 'chat_id');
  pgm.createIndex('messages', 'created_at');

  pgm.createTable('message_attachments', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    message_id: { type: 'uuid', notNull: true, references: 'messages', onDelete: 'CASCADE' },
    kind: { type: 'attachment_kind', notNull: true },
    file_key: { type: 'text' },
    mime_type: { type: 'text' },
    size_bytes: { type: 'bigint' },
    duration_seconds: { type: 'integer' },
    scan_status: { type: 'attachment_scan_status', notNull: true, default: 'pending' },
    quarantine_reason: { type: 'text' },
    admin_deleted_at: { type: 'timestamptz' },
    purge_at: { type: 'timestamptz' },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
  });
  pgm.createIndex('message_attachments', 'message_id');

  pgm.createTable('message_reactions', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    message_id: { type: 'uuid', notNull: true, references: 'messages', onDelete: 'CASCADE' },
    user_id: { type: 'uuid', notNull: true, references: 'users', onDelete: 'CASCADE' },
    emoji: { type: 'text', notNull: true },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
  });
  pgm.addConstraint('message_reactions', 'message_reactions_msg_user_emoji_unique', {
    unique: ['message_id', 'user_id', 'emoji'],
  });

  pgm.createTable('message_mentions', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    message_id: { type: 'uuid', notNull: true, references: 'messages', onDelete: 'CASCADE' },
    mentioned_user_id: { type: 'uuid', notNull: true, references: 'users', onDelete: 'CASCADE' },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
  });
  pgm.createIndex('message_mentions', 'message_id');

  pgm.createTable('message_edits', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    message_id: { type: 'uuid', notNull: true, references: 'messages', onDelete: 'CASCADE' },
    old_body_enc: { type: 'text' },
    edited_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
  });
  pgm.createIndex('message_edits', 'message_id');

  pgm.createTable('message_drafts', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    chat_id: { type: 'uuid', notNull: true, references: 'chats', onDelete: 'CASCADE' },
    user_id: { type: 'uuid', notNull: true, references: 'users', onDelete: 'CASCADE' },
    body_enc: { type: 'text' },
    updated_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
  });
  pgm.addConstraint('message_drafts', 'message_drafts_chat_user_unique', {
    unique: ['chat_id', 'user_id'],
  });

  pgm.createTable('message_receipts', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    message_id: { type: 'uuid', notNull: true, references: 'messages', onDelete: 'CASCADE' },
    user_id: { type: 'uuid', notNull: true, references: 'users', onDelete: 'CASCADE' },
    delivered_at: { type: 'timestamptz' },
    read_at: { type: 'timestamptz' },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
  });
  pgm.addConstraint('message_receipts', 'message_receipts_msg_user_unique', {
    unique: ['message_id', 'user_id'],
  });

  pgm.createTable('conversation_settings', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    chat_id: { type: 'uuid', notNull: true, references: 'chats', onDelete: 'CASCADE' },
    user_id: { type: 'uuid', notNull: true, references: 'users', onDelete: 'CASCADE' },
    is_muted: { type: 'boolean', notNull: true, default: false },
    muted_until: { type: 'timestamptz' },
    is_archived: { type: 'boolean', notNull: true, default: false },
    archived_at: { type: 'timestamptz' },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
  });
  pgm.addConstraint('conversation_settings', 'conversation_settings_chat_user_unique', {
    unique: ['chat_id', 'user_id'],
  });

  pgm.createTable('file_access_links', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    attachment_id: {
      type: 'uuid',
      notNull: true,
      references: 'message_attachments',
      onDelete: 'CASCADE',
    },
    user_id: { type: 'uuid', references: 'users', onDelete: 'SET NULL' },
    signed_url_hash: { type: 'text' },
    expires_at: { type: 'timestamptz' },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
  });
  pgm.createIndex('file_access_links', 'attachment_id');

  pgm.createTable('file_preview_events', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    attachment_id: {
      type: 'uuid',
      notNull: true,
      references: 'message_attachments',
      onDelete: 'CASCADE',
    },
    user_id: { type: 'uuid', references: 'users', onDelete: 'SET NULL' },
    action: { type: 'file_preview_action', notNull: true },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
  });
  pgm.createIndex('file_preview_events', 'attachment_id');

  pgm.createTable('important_read_receipts', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    deal_id: { type: 'uuid', notNull: true, references: 'deals', onDelete: 'CASCADE' },
    user_id: { type: 'uuid', notNull: true, references: 'users', onDelete: 'CASCADE' },
    item_type: { type: 'text' },
    item_id: { type: 'uuid' },
    viewed_at: { type: 'timestamptz' },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
  });
  pgm.createIndex('important_read_receipts', 'deal_id');

  pgm.createTable('handover_items', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    deal_id: { type: 'uuid', notNull: true, references: 'deals', onDelete: 'RESTRICT' },
    seller_id: { type: 'uuid', references: 'users', onDelete: 'SET NULL' },
    middleman_id: { type: 'uuid', references: 'users', onDelete: 'SET NULL' },
    encrypted_payload: { type: 'text' },
    item_type: { type: 'handover_item_type' },
    verification_status: { type: 'text' },
    reveal_status: { type: 'handover_reveal_status', notNull: true, default: 'middleman_only' },
    transferred_to_buyer_at: { type: 'timestamptz' },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
  });
  pgm.createIndex('handover_items', 'deal_id');

  pgm.createTable('handover_vault_items', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    handover_item_id: {
      type: 'uuid',
      notNull: true,
      references: 'handover_items',
      onDelete: 'CASCADE',
    },
    secret_type: { type: 'handover_secret_type', notNull: true },
    secret_enc: { type: 'text' },
    version: { type: 'integer', notNull: true, default: 1 },
    active: { type: 'boolean', notNull: true, default: true },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
  });
  pgm.createIndex('handover_vault_items', 'handover_item_id');

  pgm.createTable('handover_access_logs', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    handover_item_id: {
      type: 'uuid',
      notNull: true,
      references: 'handover_items',
      onDelete: 'CASCADE',
    },
    viewer_id: { type: 'uuid', references: 'users', onDelete: 'SET NULL' },
    access_type: { type: 'handover_access_type', notNull: true },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
  });
  pgm.createIndex('handover_access_logs', 'handover_item_id');
};

/** @param {MigrationBuilder} pgm */
exports.down = (pgm) => {
  pgm.dropTable('handover_access_logs');
  pgm.dropTable('handover_vault_items');
  pgm.dropTable('handover_items');
  pgm.dropTable('important_read_receipts');
  pgm.dropTable('file_preview_events');
  pgm.dropTable('file_access_links');
  pgm.dropTable('conversation_settings');
  pgm.dropTable('message_receipts');
  pgm.dropTable('message_drafts');
  pgm.dropTable('message_edits');
  pgm.dropTable('message_mentions');
  pgm.dropTable('message_reactions');
  pgm.dropTable('message_attachments');
  pgm.dropTable('messages');
  pgm.dropTable('chats');

  pgm.dropType('handover_access_type');
  pgm.dropType('handover_secret_type');
  pgm.dropType('handover_reveal_status');
  pgm.dropType('handover_item_type');
  pgm.dropType('file_preview_action');
  pgm.dropType('attachment_scan_status');
  pgm.dropType('attachment_kind');
  pgm.dropType('chat_status');
  pgm.dropType('chat_type');
};
