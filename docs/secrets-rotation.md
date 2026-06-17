# Secrets Rotation Runbook

> **TrustVexa — Operational Procedures**
>
> This document provides step-by-step procedures for rotating every runtime
> secret used by the TrustVexa platform. Each section covers the impact of
> rotation, the pre-requisites, and the exact steps to follow.

---

## 1. `TRUSTVEXA_MASTER_KEK` — Key-Encryption Key

The KEK encrypts all PII envelope keys used by `sealPii()` / `openPii()`. Rotating
the KEK requires **re-encrypting every sealed field** in the database.

### Impact

- All existing `*_enc` columns (emails, wallet addresses, ticket bodies, deal
  drafts, contact messages) are encrypted under the current KEK.
- A cold rotation (swap without re-encryption) makes all sealed data permanently
  unreadable.

### Procedure

1. **Generate a new 32-byte KEK:**
   ```bash
   openssl rand -base64 32
   ```
2. **Set the new key as `TRUSTVEXA_MASTER_KEK_NEW` in the platform secret store.**
3. **Run the re-encryption migration script** (one-time batch job):
   ```
   node scripts/rotate-kek.js \
     --old-kek "$TRUSTVEXA_MASTER_KEK" \
     --new-kek "$TRUSTVEXA_MASTER_KEK_NEW"
   ```
   The script:
   - Scans every table with `*_enc` columns.
   - For each row: `openPii(oldKek, ciphertext)` → `sealPii(newKek, plaintext)`.
   - Writes the re-encrypted value back in a transaction.
   - Logs progress to stdout; safe to interrupt and resume (idempotent per-row).
4. **Verify** a sample of rows decrypt correctly under the new KEK.
5. **Swap the env var:**
   ```
   TRUSTVEXA_MASTER_KEK=$TRUSTVEXA_MASTER_KEK_NEW
   ```
   Remove `TRUSTVEXA_MASTER_KEK_NEW`.
6. **Deploy** the updated secret to all services (API, Worker).
7. **Restart** all running instances to pick up the new KEK.

### Rollback

Keep the old KEK value in a secure offline backup for at least 30 days.

---

## 2. `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET`

These secrets sign and verify JWT access and refresh tokens. Rotation
invalidates all existing tokens.

### Impact

- **Access tokens** (short-lived, 15 min): users see a brief interruption; the
  client's silent refresh handles reauth automatically.
- **Refresh tokens** (long-lived, 7–30 days): all active sessions are
  invalidated; users must re-login.

### Procedure

1. **Generate new secrets:**
   ```bash
   openssl rand -hex 64   # JWT_ACCESS_SECRET
   openssl rand -hex 64   # JWT_REFRESH_SECRET
   ```
2. **Flush the JWT denylist** in Redis (optional — old JTIs become irrelevant):
   ```bash
   redis-cli --tls -u "$REDIS_URL" KEYS "jti:*" | xargs redis-cli DEL
   ```
3. **Update the secrets** in the platform secret store.
4. **Deploy** to all API instances.
5. **Monitor** auth error rates for 15 minutes; expect a spike of `invalid_token`
   errors as clients silently refresh and re-login.

### Rollback

Revert to the old secret values. Active sessions minted under the new secret
will be invalidated (acceptable — a second re-login).

---

## 3. `FILE_LINK_SECRET`

Used to sign time-limited file preview URLs. Rotation breaks all outstanding
signed links.

### Impact

- Any file preview URL generated before rotation returns `403 Forbidden`.
- No PII exposure risk — only file access is interrupted.

### Procedure

1. **Choose a low-traffic window** (e.g. 03:00–05:00 UTC) to minimize user
   impact. Preview links have a default TTL of 1 hour, so most will have expired
   naturally.
2. **Generate a new secret:**
   ```bash
   openssl rand -hex 32
   ```
3. **Update `FILE_LINK_SECRET`** in the platform secret store.
4. **Deploy** to all API instances.
5. **Communicate** to users (if needed) that they may need to re-open any active
   file preview tabs.

### Rollback

Revert to the old secret. New links minted under the new secret will break;
re-deploy with the old secret to restore them.

---

## 4. Operator HD Wallet Signing Keys

These are the keys used to sign on-chain payout transactions. Rotation requires
a key ceremony and fund migration.

### Impact

- The old wallet addresses still hold escrow funds until drained.
- The new keys control the new hot-wallet addresses for future payouts.

### Procedure

1. **Generate new keys offline** in an air-gapped environment:
   - Use a hardware wallet or an offline machine.
   - Derive keys from a new BIP-39 mnemonic with BIP-44 derivation paths per
     supported chain (ETH, BNB, TRON, SOLANA).
2. **Record the new public addresses** and update `OPERATOR_WALLET_*` env vars.
3. **Migrate funds** from old hot-wallet addresses to new ones:
   - For each chain: create and sign a sweep transaction transferring the full
     balance (minus gas) to the new address.
   - Wait for confirmation thresholds (ETH: 12, BNB: 15, TRON: 20, SOLANA:
     finalized).
4. **Update the signing key env vars** in the platform secret store.
5. **Deploy** to the Worker service (the Worker broadcasts payout transactions).
6. **Verify** a test payout from the new keys succeeds on each chain.
7. **Securely destroy** the old mnemonic backup (shred / burn) after the
   migration grace period (30 days minimum).

### Rollback

Keep the old signing keys accessible for 30 days. If the new keys are
compromised, immediately sweep funds back to the old addresses and rotate again.

---

## General Best Practices

- **Never log secret values.** Log only the operation ("KEK rotated", "JWT
  secret updated") and its timestamp.
- **Rotate on a schedule.** KEK and JWT secrets should be rotated at least once
  per quarter. Signing keys should be rotated annually or on any personnel change.
- **Automate where possible.** The KEK re-encryption script and JWT denylist
  flush should be part of a CI/CD runbook step.
- **Test in staging first.** Every rotation procedure should be validated in the
  staging environment before production.
- **Notify the team.** Post a message in the `#ops` channel before and after
  every production rotation.
