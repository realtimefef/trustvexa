/**
 * Migration: support_ticket_replies table.
 *
 * Stores staff (middleman) replies to user support tickets. Referenced by the
 * admin Support & Cases panel (GET/POST /support/admin/tickets/:id/reply).
 */

/** @param {import('node-pg-migrate').MigrationBuilder} pgm */
exports.up = (pgm) => {
  pgm.createTable('support_ticket_replies', {
    id: {
      type: 'uuid',
      primaryKey: true,
      default: pgm.func('gen_random_uuid()'),
      notNull: true,
    },
    ticket_id: {
      type: 'uuid',
      notNull: true,
      references: '"support_tickets"',
      onDelete: 'CASCADE',
    },
    author_id: {
      type: 'uuid',
      notNull: false,   // nullable so deleting a user does not orphan their replies
      references: '"users"',
      onDelete: 'SET NULL',
    },
    author_role: { type: 'text' },
    /**
     * Reply body, envelope-encrypted via sealPii() — same pattern as
     * support_tickets.body_enc so all message content is protected at rest.
     */
    body_enc: { type: 'text' },
    created_at: {
      type: 'timestamptz',
      notNull: true,
      default: pgm.func('now()'),
    },
  });

  pgm.createIndex('support_ticket_replies', ['ticket_id', 'created_at']);

  // Update the parent ticket's last_update_at automatically on each new reply.
  pgm.createFunction(
    'update_ticket_last_update',
    [],
    {
      returns: 'trigger',
      language: 'plpgsql',
    },
    `
    BEGIN
      UPDATE support_tickets
        SET last_update_at = now()
        WHERE id = NEW.ticket_id;
      RETURN NEW;
    END;
    `,
  );

  pgm.createTrigger(
    'support_ticket_replies',
    'trg_update_ticket_on_reply',
    {
      when: 'AFTER',
      operation: 'INSERT',
      level: 'ROW',
      function: 'update_ticket_last_update',
    },
  );
};

/** @param {import('node-pg-migrate').MigrationBuilder} pgm */
exports.down = (pgm) => {
  pgm.dropTrigger('support_ticket_replies', 'trg_update_ticket_on_reply', { ifExists: true });
  pgm.dropFunction('update_ticket_last_update', [], { ifExists: true });
  pgm.dropTable('support_ticket_replies');
};
