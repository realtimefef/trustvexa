/* eslint-disable */
/**
 * Migration adding privacy preferences, digest tracking columns, and preferred middleman column.
 */

exports.shorthands = undefined;

/** @param {import('node-pg-migrate').MigrationBuilder} pgm */
exports.up = (pgm) => {
  // Add privacy columns to user_preferences
  pgm.addColumns('user_preferences', {
    profile_visibility: { type: 'text', notNull: true, default: 'public' },
    messaging_permission: { type: 'text', notNull: true, default: 'anyone' },
    show_online_status: { type: 'boolean', notNull: true, default: true },
    show_completed_deals: { type: 'boolean', notNull: true, default: true },
  });

  // Add digest_sent_at to notifications table
  pgm.addColumns('notifications', {
    digest_sent_at: { type: 'timestamptz' },
  });

  // Add preferred_middleman_id to deals table
  pgm.addColumns('deals', {
    preferred_middleman_id: { type: 'uuid', references: 'users', onDelete: 'SET NULL' },
  });
};

/** @param {import('node-pg-migrate').MigrationBuilder} pgm */
exports.down = (pgm) => {
  pgm.dropColumns('deals', ['preferred_middleman_id']);
  pgm.dropColumns('notifications', ['digest_sent_at']);
  pgm.dropColumns('user_preferences', [
    'profile_visibility',
    'messaging_permission',
    'show_online_status',
    'show_completed_deals',
  ]);
};
