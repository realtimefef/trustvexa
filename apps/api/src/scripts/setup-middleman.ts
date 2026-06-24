/**
 * One-off operator script: create (or update) the platform middleman account
 * with REAL, working login credentials.
 *
 * Why this exists:
 *   The default-middleman seed migration (1700002600000) can create the
 *   `trustvexa_admin` row, but it cannot produce a usable LOGIN because:
 *     1. password_hash is a placeholder (no real password verifies against it);
 *     2. email_hash in the migration is a plain SHA-256, whereas login looks up
 *        users by a KEYED hash (HMAC with AUTH_LOOKUP_HASH_KEY), so the email
 *        lookup never matches.
 *   A static SQL migration has no access to the runtime secrets, so the only
 *   correct way to mint credentials is from inside the app using the same
 *   hashLookup + argon2 + PII-seal primitives the auth service uses.
 *
 * Usage (run where the API env vars are present, e.g. the Render shell):
 *   node dist/scripts/setup-middleman.js <email> <password> [username]
 * or via env:
 *   MM_EMAIL=... MM_PASSWORD=... MM_USERNAME=trustvexa_admin \
 *     node dist/scripts/setup-middleman.js
 *
 * Requires: DATABASE_URL, AUTH_LOOKUP_HASH_KEY, TRUSTVEXA_MASTER_KEK (prod).
 *
 * After it runs, log in at /login with the email + password; the account has
 * account_type='middleman', so the /middleman dashboard and /admin console
 * become available.
 */
import { query, getClient, hashLookup } from '@trustvexa/shared';

import { getAuthConfig } from '../modules/auth/auth.config.js';
import { hashPassword, checkPasswordStrength } from '../modules/auth/password.js';
import { sealPii } from '../modules/crypto/key-provider.js';

async function main(): Promise<void> {
  const argv = process.argv.slice(2);
  const email = (argv[0] ?? process.env.MM_EMAIL ?? '').trim().toLowerCase();
  const password = argv[1] ?? process.env.MM_PASSWORD ?? '';
  const username = (argv[2] ?? process.env.MM_USERNAME ?? 'trustvexa_admin').trim();

  if (!email || !password) {
    console.error(
      'Usage: node dist/scripts/setup-middleman.js <email> <password> [username]\n' +
        '   or: MM_EMAIL=.. MM_PASSWORD=.. [MM_USERNAME=..] node dist/scripts/setup-middleman.js',
    );
    process.exit(1);
  }

  const strength = checkPasswordStrength(password, { email, username });
  if (!strength.ok) {
    console.error('Weak password:', strength.reasons.join('; '));
    process.exit(1);
  }

  const cfg = getAuthConfig(); // throws clearly if AUTH_LOOKUP_HASH_KEY is missing
  const emailHash = hashLookup(email, cfg.lookupHashKey);
  const emailEnc = await sealPii(email);
  const passwordHash = await hashPassword(password);

  // Guard: refuse to hijack an unrelated account that already owns this email.
  const emailOwner = await query<{ id: string; username: string }>(
    `SELECT id, username FROM users WHERE email_hash = $1 LIMIT 1`,
    [emailHash],
  );
  if (emailOwner.rows[0] && emailOwner.rows[0].username !== username) {
    console.error(
      `That email already belongs to a different account ("${emailOwner.rows[0].username}"). ` +
        'Use a different email, or pass that username as the 3rd argument to promote it.',
    );
    process.exit(1);
  }

  const client = await getClient();
  try {
    await client.query('BEGIN');
    const existing = await client.query<{ id: string }>(
      `SELECT id FROM users WHERE username = $1 LIMIT 1`,
      [username],
    );

    let userId: string;
    if (existing.rows[0]) {
      userId = existing.rows[0].id;
      await client.query(
        `UPDATE users
            SET email_hash = $2,
                email_enc = $3,
                password_hash = $4,
                account_type = 'middleman',
                account_status = 'active',
                account_label = 'trusted',
                age_confirmed_at = COALESCE(age_confirmed_at, now()),
                updated_at = now()
          WHERE id = $1`,
        [userId, emailHash, emailEnc, passwordHash],
      );
      console.log(`Updated existing account "${username}" -> middleman with new credentials.`);
    } else {
      const inserted = await client.query<{ id: string }>(
        `INSERT INTO users
           (username, email_hash, email_enc, password_hash,
            account_type, account_status, account_label, trust_level,
            age_confirmed_at, created_at, updated_at)
         VALUES ($1, $2, $3, $4, 'middleman', 'active', 'trusted', 5, now(), now(), now())
         RETURNING id`,
        [username, emailHash, emailEnc, passwordHash],
      );
      userId = inserted.rows[0]!.id;
      console.log(`Created new middleman account "${username}".`);
    }

    // Seed an initial trust event if none exists (mirrors the seed migration).
    await client.query(
      `INSERT INTO trust_events (user_id, change, reason, deal_id)
       SELECT $1, 5, 'default_middleman_initial_trust', NULL
        WHERE NOT EXISTS (
          SELECT 1 FROM trust_events
           WHERE user_id = $1 AND reason = 'default_middleman_initial_trust'
        )`,
      [userId],
    );

    await client.query('COMMIT');
    console.log('\nDone. Log in at /login with:');
    console.log(`  email:    ${email}`);
    console.log('  password: (the one you provided)');
    console.log('Then open /middleman (and /admin for the full console).');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('setup-middleman failed:', err instanceof Error ? err.message : err);
    process.exit(1);
  });
