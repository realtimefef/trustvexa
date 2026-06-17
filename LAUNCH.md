# TrustVexa — Real Money Launch Checklist

Complete every item below **in order** before setting `MAINNET_ENABLED=true`.

---

## Step 1 — Run database migrations

```bash
pnpm migrate:up
```

This applies all pending migrations, including the new `support_ticket_replies` table.
Verify it ran successfully before continuing.

---

## Step 2 — Generate secrets

Run these commands on your local machine (never on the server):

```bash
# Master encryption key (KEK) — protects all PII at rest
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
# → TRUSTVEXA_MASTER_KEK

# Email lookup hash key
node -e "console.log(require('crypto').randomBytes(24).toString('base64'))"
# → AUTH_LOOKUP_HASH_KEY

# JWT secrets (run twice — one for access, one for refresh)
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
# → JWT_ACCESS_SECRET
# → JWT_REFRESH_SECRET

# File link signing secret
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
# → FILE_LINK_SECRET
```

---

## Step 3 — Set environment variables in Render dashboard

Go to each Render service → Environment → Add the following.
**Never commit these to git.**

### Required for ALL services:
| Variable | Value |
|---|---|
| `NODE_ENV` | `production` |
| `DATABASE_URL` | From Render managed PostgreSQL |
| `REDIS_URL` | From Render managed Redis (`rediss://`) |
| `TRUSTVEXA_MASTER_KEK` | Generated in Step 2 |
| `AUTH_LOOKUP_HASH_KEY` | Generated in Step 2 |
| `FILE_LINK_SECRET` | Generated in Step 2 |
| `JWT_ACCESS_SECRET` | Generated in Step 2 |
| `JWT_REFRESH_SECRET` | Generated in Step 2 |
| `WEB_BASE_URL` | `https://your-domain.com` |
| `API_BASE_URL` | `https://api.your-domain.com` |
| `CORS_ORIGINS` | `https://your-domain.com` |

### Required for API service:
| Variable | Value |
|---|---|
| `MAIL_HOST` | Your SMTP host |
| `MAIL_PORT` | `587` |
| `MAIL_USER` | `noreply@your-domain.com` |
| `MAIL_PASSWORD` | Your SMTP password |
| `MAIL_FROM` | `noreply@your-domain.com` |
| `ADMIN_EMAIL` | Your admin email address |

### Required — Your real wallet addresses (escrow receives):
| Variable | Value |
|---|---|
| `RECEIVE_ADDRESS_ETH_ETH` | Your ETH wallet address (`0x...`) |
| `RECEIVE_ADDRESS_BNB_BNB` | Your BNB wallet address (`0x...`) |
| `RECEIVE_ADDRESS_SOL_SOLANA` | Your Solana wallet address |
| `RECEIVE_ADDRESS_TRX_TRON` | Your TRON wallet address |
| `RECEIVE_ADDRESS_USDT_ETH` | Same as ETH address |
| `RECEIVE_ADDRESS_USDT_BNB` | Same as BNB address |
| `RECEIVE_ADDRESS_USDT_TRON` | Same as TRON address |
| `RECEIVE_ADDRESS_USDT_SOLANA` | Same as Solana address |

> ⚠️ **You MUST control the private keys for these addresses.**
> The platform sends buyer deposits here. Without the keys you cannot release payouts.

### Required for automatic deposit detection:
| Variable | Value |
|---|---|
| `DEPOSIT_WATCH_ETH_RPC_URL` | Infura/Alchemy ETH mainnet URL |
| `DEPOSIT_WATCH_BNB_RPC_URL` | `https://bsc-dataseed1.binance.org` |
| `DEPOSIT_WATCH_TRON_RPC_URL` | `https://api.trongrid.io` |
| `TRONWEB_API_KEY` | Your TronGrid API key |
| `DEPOSIT_WATCH_SOLANA_RPC_URL` | `https://api.mainnet-beta.solana.com` |

> Without these, deposits still work — buyers paste their tx hash and you verify manually.
> Automatic detection makes this faster.

### Required for file uploads (S3):
| Variable | Value |
|---|---|
| `S3_ENDPOINT` | `https://s3.amazonaws.com` |
| `S3_REGION` | `us-east-1` |
| `S3_BUCKET` | Your S3 bucket name |
| `S3_ACCESS_KEY_ID` | AWS access key |
| `S3_SECRET_ACCESS_KEY` | AWS secret key |

---

## Step 4 — Verify the go-live checklist in the admin console

1. Log in as the middleman account
2. Go to `/admin/operations`
3. All 4 health indicators should be green (API / DB / Redis / Worker)
4. Confirm no active emergency pauses
5. Confirm `new_deals`, `deposits`, `payouts`, `withdrawals`, `signups` feature flags are all ON

---

## Step 5 — Enable mainnet (LAST step)

Only after ALL above steps are complete:

1. In Render dashboard → API service → Environment
2. Set `MAINNET_ENABLED=true`
3. Redeploy the API service
4. Set `MAINNET_ENABLED=true` on the Worker service
5. Redeploy the Worker service

> **This is the point of no return.** Once enabled, the payout worker will
> broadcast real on-chain transactions. Test with a small deal first.

---

## Step 6 — First test deal (recommended)

Before announcing to users:

1. Create two test accounts (buyer + seller)
2. Create a deal for the minimum amount ($400)
3. Send a small real amount to the escrow address
4. Verify it auto-detects (or manually confirm)
5. Complete the full escrow flow through to payout
6. Confirm the seller receives the funds

---

## Operational limits to set in production

Log in as middleman → Operations → add these circuit-breaker pauses if something goes wrong:

| Scope | When to pause |
|---|---|
| `payouts` | If you suspect a payout error |
| `deposits` | If you see suspicious inbound traffic |
| `new_deals` | During maintenance |
| `withdrawals` | If a user account is compromised |
| `signups` | To stop new registrations temporarily |

---

## Emergency contacts

If a payout is stuck or an on-chain tx fails:
1. Go to `/admin/operations` → check audit log for the payout job
2. Check the Worker service logs in Render dashboard
3. The `payout_queue` table in PostgreSQL shows all payouts and their status
4. A payout in `broadcast` status with a `tx_hash` is already on-chain — check the explorer

---

## Done ✅

The platform is live for real money once `MAINNET_ENABLED=true` is deployed.
