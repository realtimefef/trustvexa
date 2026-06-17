/* eslint-disable */
/**
 * Reviews & notifications table group migration (task 2.4).
 *
 * Creates the §16 "Reviews & notifications" tables exactly as listed:
 *   reviews (unique (deal_id, reviewer_id), rating 1–5),
 *   notifications (priority normal/important), notification_preferences
 *   (unique (user_id, event_type, channel)).
 *
 * Reviews expose only the reviewer's username, never email or PII. The rating
 * range (1–5) is enforced by a CHECK constraint. *(Requirements 43.7, 25, 36, 25.3, 43.4)*
 *
 * @typedef {import('node-pg-migrate').MigrationBuilder} MigrationBuilder
 */

exports.shorthands = undefined;

/** @param {MigrationBuilder} pgm */
exports.up = (pgm) => {
  pgm.createType('notification_priority', ['normal', 'important']);
  pgm.createType('notification_channel', ['email', 'in_app']);

  pgm.createTable('reviews', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    deal_id: { type: 'uuid', notNull: true, references: 'deals', onDelete: 'RESTRICT' },
    reviewer_id: { type: 'uuid', notNull: true, references: 'users', onDelete: 'RESTRICT' },
    reviewee_id: { type: 'uuid', notNull: true, references: 'users', onDelete: 'RESTRICT' },
    rating: { type: 'integer', notNull: true, check: 'rating >= 1 AND rating <= 5' },
    comment: { type: 'text' },
    is_hidden: { type: 'boolean', notNull: true, default: false },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
  });
  pgm.addConstraint('reviews', 'reviews_deal_reviewer_unique', {
    unique: ['deal_id', 'reviewer_id'],
  });
  pgm.createIndex('reviews', 'reviewee_id');

  pgm.createTable('notifications', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    user_id: { type: 'uuid', notNull: true, references: 'users', onDelete: 'CASCADE' },
    deal_id: { type: 'uuid', references: 'deals', onDelete: 'SET NULL' },
    type: { type: 'text', notNull: true },
    payload: { type: 'jsonb' },
    priority: { type: 'notification_priority', notNull: true, default: 'normal' },
    pinned: { type: 'boolean', notNull: true, default: false },
    read_at: { type: 'timestamptz' },
    archived_at: { type: 'timestamptz' },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
  });
  pgm.createIndex('notifications', 'user_id');

  pgm.createTable('notification_preferences', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    user_id: { type: 'uuid', notNull: true, references: 'users', onDelete: 'CASCADE' },
    event_type: { type: 'text', notNull: true },
    channel: { type: 'notification_channel', notNull: true },
    enabled: { type: 'boolean', notNull: true, default: true },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
  });
  pgm.addConstraint(
    'notification_preferences',
    'notification_preferences_user_event_channel_unique',
    {
      unique: ['user_id', 'event_type', 'channel'],
    },
  );
};

/** @param {MigrationBuilder} pgm */
exports.down = (pgm) => {
  pgm.dropTable('notification_preferences');
  pgm.dropTable('notifications');
  pgm.dropTable('reviews');
  pgm.dropType('notification_channel');
  pgm.dropType('notification_priority');
};
