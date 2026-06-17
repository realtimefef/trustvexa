/**
 * Deal party details tables migration.
 *
 * Creates two tables that capture the per-deal product/service information
 * submitted by each party before or during the handover phase:
 *
 *   deal_seller_details — the seller's product / delivery information.
 *   deal_buyer_details  — the buyer's receiving / contact information.
 *
 * All PII columns (delivery instructions, receiving addresses, contact emails,
 * etc.) are stored encrypted using the platform's envelope-encryption pattern
 * (`*_enc` columns). Only the middleman may read both sides; each party may
 * only read their own record. The application layer enforces these access
 * controls; the migration only defines the schema.
 *
 * Both tables have a UNIQUE constraint on deal_id so each deal has at most one
 * seller details record and one buyer details record (upsert semantics in the
 * service layer).
 *
 * Migration tool: node-pg-migrate (CommonJS, `DATABASE_URL`).
 *
 * @typedef {import('node-pg-migrate').MigrationBuilder} MigrationBuilder
 */

exports.shorthands = undefined;

/** @param {MigrationBuilder} pgm */
exports.up = (pgm) => {
  // ── deal_seller_details ──────────────────────────────────────────────────
  pgm.createTable('deal_seller_details', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    deal_id: {
      type: 'uuid',
      notNull: true,
      references: 'deals',
      onDelete: 'CASCADE',
      unique: true,
    },
    // Public / non-PII fields
    product_name: { type: 'text' },
    delivery_method: { type: 'text' },   // e.g. 'email', 'download', 'account transfer'
    estimated_delivery_time: { type: 'text' },
    // Encrypted PII fields
    product_description_enc: { type: 'text' },
    requirements_enc: { type: 'text' },          // what the buyer must do/provide
    delivery_instructions_enc: { type: 'text' }, // HOW to deliver
    additional_notes_enc: { type: 'text' },
    // Submission & verification metadata
    submitted_at: { type: 'timestamptz', default: pgm.func('now()') },
    verified_by_middleman: { type: 'boolean', notNull: true, default: false },
    verified_at: { type: 'timestamptz' },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
    updated_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
  });
  pgm.createIndex('deal_seller_details', 'deal_id');

  // ── deal_buyer_details ───────────────────────────────────────────────────
  pgm.createTable('deal_buyer_details', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    deal_id: {
      type: 'uuid',
      notNull: true,
      references: 'deals',
      onDelete: 'CASCADE',
      unique: true,
    },
    // Public / non-PII fields
    receiving_platform: { type: 'text' }, // e.g. 'email', 'telegram', 'discord', 'wallet'
    // Encrypted PII fields
    receiving_address_enc: { type: 'text' }, // email/username/address to receive
    contact_email_enc: { type: 'text' },
    backup_contact_enc: { type: 'text' },
    special_instructions_enc: { type: 'text' },
    suggestions_enc: { type: 'text' },           // buyer's notes/suggestions
    // Confirmation metadata
    confirmed_by_buyer: { type: 'boolean', notNull: true, default: false },
    confirmed_at: { type: 'timestamptz' },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
    updated_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
  });
  pgm.createIndex('deal_buyer_details', 'deal_id');
};

/** @param {MigrationBuilder} pgm */
exports.down = (pgm) => {
  pgm.dropTable('deal_buyer_details');
  pgm.dropTable('deal_seller_details');
};
