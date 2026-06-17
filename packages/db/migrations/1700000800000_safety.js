/* eslint-disable */
/**
 * Safety table group migration (task 2.8).
 *
 * Creates: abuse_flags (live counters stay in Redis), incident_pauses,
 * delivery_checklists. Conventions inherited from tasks 2.1/2.2.
 * *(Requirements 33.6, 35, 40, 43.7)*
 *
 * @typedef {import('node-pg-migrate').MigrationBuilder} MigrationBuilder
 */

exports.shorthands = undefined;

/** @param {MigrationBuilder} pgm */
exports.up = (pgm) => {
  const createdAt = { type: 'timestamptz', notNull: true, default: pgm.func('now()') };
  const id = { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') };

  pgm.createTable('abuse_flags', {
    id,
    subject: { type: 'text' },
    type: { type: 'text' },
    details: { type: 'text' },
    created_at: createdAt,
  });

  pgm.createTable('incident_pauses', {
    id,
    scope: { type: 'text', notNull: true },
    reason: { type: 'text' },
    started_by: { type: 'uuid', references: 'users', onDelete: 'SET NULL' },
    started_at: { type: 'timestamptz' },
    ended_by: { type: 'uuid', references: 'users', onDelete: 'SET NULL' },
    ended_at: { type: 'timestamptz' },
    created_at: createdAt,
  });

  pgm.createTable('delivery_checklists', {
    id,
    deal_id: { type: 'uuid', notNull: true, references: 'deals', onDelete: 'CASCADE' },
    checklist_type: { type: 'text' },
    item_key: { type: 'text' },
    checked_by: { type: 'uuid', references: 'users', onDelete: 'SET NULL' },
    checked_at: { type: 'timestamptz' },
    created_at: createdAt,
  });
  pgm.createIndex('delivery_checklists', 'deal_id');
};

/** @param {MigrationBuilder} pgm */
exports.down = (pgm) => {
  pgm.dropTable('delivery_checklists');
  pgm.dropTable('incident_pauses');
  pgm.dropTable('abuse_flags');
};
