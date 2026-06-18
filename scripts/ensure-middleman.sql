-- ensure-middleman.sql
-- Run this script to guarantee the default TrustVexa middleman account exists.
-- Safe to run multiple times (fully idempotent).
-- Requires the pgcrypto extension (enabled by the baseline migration).
--
-- Usage:
--   psql "$DATABASE_URL" -f scripts/ensure-middleman.sql

-- 1. Insert the default middleman user (no-op if username already exists).
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
ON CONFLICT (username) DO NOTHING;

-- 2. Seed the initial trust_events record (no-op if already present).
INSERT INTO trust_events (user_id, change, reason, deal_id)
SELECT id, 5, 'default_middleman_initial_trust', NULL
FROM users
WHERE username = 'trustvexa_admin'
  AND NOT EXISTS (
    SELECT 1 FROM trust_events te
    WHERE te.user_id = users.id
      AND te.reason = 'default_middleman_initial_trust'
  );

-- IMPORTANT: After running this script, update the password_hash for
-- 'trustvexa_admin' via the admin UI before granting any access.
