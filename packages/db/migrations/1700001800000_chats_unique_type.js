/* eslint-disable */
/**
 * One chat per (deal, type).
 *
 * The chat rooms (buyer_seller, buyer_mm, seller_mm, handover_mm) are created
 * once per deal and reused. A UNIQUE (deal_id, type) constraint makes the
 * `ensureChat` upsert (INSERT ... ON CONFLICT DO NOTHING) idempotent so deal
 * provisioning can be retried without creating duplicate rooms.
 *
 * @typedef {import('node-pg-migrate').MigrationBuilder} MigrationBuilder
 */

exports.shorthands = undefined;

/** @param {MigrationBuilder} pgm */
exports.up = (pgm) => {
  // Defensively collapse any pre-existing duplicates before adding the unique
  // constraint (keep the oldest row per deal/type).
  pgm.sql(`
    DELETE FROM chats c
     USING chats c2
     WHERE c.deal_id = c2.deal_id
       AND c.type = c2.type
       AND c.created_at > c2.created_at;
  `);
  pgm.addConstraint('chats', 'chats_deal_type_unique', {
    unique: ['deal_id', 'type'],
  });
};

/** @param {MigrationBuilder} pgm */
exports.down = (pgm) => {
  pgm.dropConstraint('chats', 'chats_deal_type_unique');
};
