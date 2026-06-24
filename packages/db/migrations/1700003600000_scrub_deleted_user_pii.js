/* eslint-disable */
/**
 * Backfill: scrub PII from accounts that are already marked deleted.
 *
 * Deleted accounts must leave nothing personal behind, and — critically — the
 * same email must be reusable to register a brand-new account. Older deletions
 * (before the delete flow cleared the lookup hashes) still hold their
 * `email_hash` / `recovery_email_hash`, so the uniqueness check blocked
 * re-registration with "email already exists". This one-off backfill clears the
 * hashes + encrypted blobs and anonymizes the username for every already-deleted
 * row. The delete code paths now do this going forward.
 *
 * @typedef {import('node-pg-migrate').MigrationBuilder} MigrationBuilder
 */

exports.shorthands = undefined;

/** @param {MigrationBuilder} pgm */
exports.up = (pgm) => {
  pgm.sql(`
    UPDATE users
       SET email_enc = NULL,
           recovery_email_enc = NULL,
           email_hash = NULL,
           recovery_email_hash = NULL,
           username = 'deleted_' || left(replace(id::text, '-', ''), 10),
           updated_at = now()
     WHERE account_status::text = 'deleted'
       AND (email_hash IS NOT NULL OR recovery_email_hash IS NOT NULL);
  `);
};

/** @param {MigrationBuilder} _pgm */
exports.down = (_pgm) => {
  /* Non-reversible data scrub. */
};
