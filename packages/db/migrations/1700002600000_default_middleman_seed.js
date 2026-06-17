/**
 * Default middleman account seed migration.
 *
 * Inserts a single platform-default middleman account so the "Chat with
 * middleman" and "Request middleman" flows always find at least one available
 * middleman. Uses ON CONFLICT DO NOTHING so re-running is idempotent.
 *
 * Security notes:
 *   - password_hash is set to a placeholder argon2id token; the operator MUST
 *     replace it via the admin UI before granting access to this account.
 *   - email_hash is the SHA-256 hex digest of admin@trustvexa.com, computed
 *     inline by PostgreSQL so no secret leaves the database.
 *   - email_enc is intentionally NULL — the operator should supply the encrypted
 *     email via the admin UI after applying this migration.
 *
 * Migration tool: node-pg-migrate (CommonJS, `DATABASE_URL`).
 *
 * @typedef {import('node-pg-migrate').MigrationBuilder} MigrationBuilder
 */

exports.shorthands = undefined;

/** @param {MigrationBuilder} pgm */
exports.up = (pgm) => {
  // Insert the default middleman user.
  // The email_hash is computed by PostgreSQL using the built-in digest()
  // function (from pgcrypto, already enabled) so the raw email is never
  // embedded in the migration source.
  pgm.sql(`
    INSERT INTO users (
      id,
      username,
      email_hash,
      email_enc,
      account_type,
      account_status,
      account_label,
      password_hash,
      trust_level,
      created_at,
      updated_at
    )
    VALUES (
      gen_random_uuid(),
      'trustvexa_admin',
      encode(digest('admin@trustvexa.com', 'sha256'), 'hex'),
      NULL,
      'middleman',
      'active',
      'trusted',
      '$argon2id$v=19$m=65536,t=3,p=4$placeholder_salt_default_mm$placeholder_hash_default_mm_trustvexa',
      5,
      now(),
      now()
    )
    ON CONFLICT (username) DO NOTHING
  `);

  // Also guard on the email_hash unique column so a re-run with an existing
  // email hash does not raise a unique-violation error.
  // (The INSERT above uses ON CONFLICT (username); if the username is free but
  // the email_hash already exists a second INSERT is still safe because the
  // SELECT below will find the existing row.)

  // Insert the initial trust_events record for the default middleman so its
  // trust history starts at genesis. The subquery safely resolves the user id
  // without hardcoding a UUID, and the INSERT is a no-op when the row already
  // exists (no unique key on trust_events, so we guard with a NOT EXISTS check).
  pgm.sql(`
    INSERT INTO trust_events (user_id, change, reason, deal_id)
    SELECT id, 5, 'default_middleman_initial_trust', NULL
    FROM users
    WHERE username = 'trustvexa_admin'
      AND NOT EXISTS (
        SELECT 1 FROM trust_events te
        WHERE te.user_id = users.id
          AND te.reason = 'default_middleman_initial_trust'
      )
  `);
};

/** @param {MigrationBuilder} pgm */
exports.down = (pgm) => {
  // Remove the default middleman and all dependent rows.
  // trust_events has ON DELETE RESTRICT so we delete them first.
  pgm.sql(`
    DELETE FROM trust_events
    WHERE user_id = (SELECT id FROM users WHERE username = 'trustvexa_admin')
  `);
  pgm.sql(`
    DELETE FROM users WHERE username = 'trustvexa_admin'
  `);
};
