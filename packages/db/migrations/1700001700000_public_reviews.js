/* eslint-disable */
/**
 * Public reviews table.
 *
 * Site-wide reviews that ANY signed-in user can post (independent of a deal,
 * unlike the deal-bound `reviews` table). The middleman can moderate them:
 * edit the text, post a public reply, hide, or soft-delete. Every moderation
 * action is audited via `admin_actions` in the service layer.
 *
 *   public_reviews
 *     - author_id        the user who wrote the review
 *     - rating           1..5 (CHECK)
 *     - title / body     review content
 *     - is_hidden        middleman hide/unhide (excluded from public read)
 *     - deleted_at/by    middleman soft-delete (excluded from public read)
 *     - edited_at/by     set when a middleman edits the text
 *     - reply_*          middleman's public reply to the review
 *
 * @typedef {import('node-pg-migrate').MigrationBuilder} MigrationBuilder
 */

exports.shorthands = undefined;

/** @param {MigrationBuilder} pgm */
exports.up = (pgm) => {
  pgm.createTable('public_reviews', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    author_id: { type: 'uuid', notNull: true, references: 'users', onDelete: 'RESTRICT' },
    rating: { type: 'integer', notNull: true, check: 'rating >= 1 AND rating <= 5' },
    title: { type: 'text' },
    body: { type: 'text', notNull: true },
    is_hidden: { type: 'boolean', notNull: true, default: false },
    deleted_at: { type: 'timestamptz' },
    deleted_by: { type: 'uuid', references: 'users', onDelete: 'SET NULL' },
    edited_at: { type: 'timestamptz' },
    edited_by: { type: 'uuid', references: 'users', onDelete: 'SET NULL' },
    reply_body: { type: 'text' },
    replied_by: { type: 'uuid', references: 'users', onDelete: 'SET NULL' },
    replied_at: { type: 'timestamptz' },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
    updated_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
  });
  pgm.createIndex('public_reviews', 'created_at');
  pgm.createIndex('public_reviews', 'author_id');
};

/** @param {MigrationBuilder} pgm */
exports.down = (pgm) => {
  pgm.dropTable('public_reviews');
};
