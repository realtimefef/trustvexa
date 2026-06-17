# TrustVexa — Render Deployment Guide
## Domain: trustvexa.com

---

## Step 1 — Push to GitHub

Push this repository to your GitHub account.

---

## Step 2 — Create Render Blueprint

1. Go to https://dashboard.render.com
2. Click **New → Blueprint**
3. Connect your GitHub repo
4. Render will auto-detect `render.yaml` and create all services:
   - `trustvexa-postgres` (PostgreSQL)
   - `trustvexa-redis` (Redis)
   - `trustvexa-api` (Express API)
   - `trustvexa-web` (Next.js frontend)
   - `trustvexa-worker` (BullMQ worker)

---

## Step 3 — Set Required Secrets in Dashboard

Go to **Render Dashboard → Environment Groups → trustvexa-shared** and fill in:

### CRITICAL (platform won't boot without these)
| Key | Value |
|-----|-------|
| `TRUSTVEXA_MASTER_KEK` | 32-byte base64: `openssl rand -base64 32` |
| `ENCRYPTION_MASTER_KEY` | 32-byte base64: `openssl rand -base64 32` |

### Google OAuth (social login)
1. Go to https://console.cloud.google.com
2. Create OAuth 2.0 credentials
3. Set Authorized redirect URI: `https://api.trustvexa.com/api/v1/auth/google/callback`
4. Fill in:
   - `GOOGLE_OAUTH_CLIENT_ID`
   - `GOOGLE_OAUTH_CLIENT_SECRET`

### Email via Resend
1. Go to https://resend.com → Sign up free
2. Add domain `trustvexa.com` → Follow DNS verification steps
3. Get your API Key from Resend dashboard
4. In Render Dashboard → trustvexa-shared env group:
   - `MAIL_PASSWORD` = your Resend API key (starts with `re_`)
   - Other MAIL_* vars are pre-set in render.yaml (host=smtp.resend.com, port=465, user=resend)

> Resend free tier: 3,000 emails/month, 100/day. Paid starts at $20/month for 50k emails.

### Object Storage via Render
1. Render Dashboard → New → Object Storage
2. Name it `trustvexa-uploads`, region: Oregon
3. Copy credentials and set in trustvexa-shared env group:
   - `S3_ENDPOINT` = your bucket endpoint (e.g. `https://trustvexa-uploads.ord1.object.render.com`)
   - `S3_ACCESS_KEY_ID` = access key
   - `S3_SECRET_ACCESS_KEY` = secret key

### Web Push (push notifications)
Generate VAPID keys:
```
npx web-push generate-vapid-keys
```
| Key | Value |
|-----|-------|
| `VAPID_PUBLIC_KEY` | generated public key |
| `VAPID_PRIVATE_KEY` | generated private key |

### Premium RPC (optional but recommended for reliability)
Replace the free public RPC endpoints with paid ones:
| Key | Provider |
|-----|----------|
| `ETH_RPC_URL_PRIMARY` | https://eth-mainnet.g.alchemy.com/v2/YOUR_KEY |
| `BNB_RPC_URL_PRIMARY` | https://bnb-mainnet.g.alchemy.com/v2/YOUR_KEY |
| `DEPOSIT_WATCH_ETH_RPC_URL` | same as ETH_RPC_URL_PRIMARY |
| `DEPOSIT_WATCH_BNB_RPC_URL` | same as BNB_RPC_URL_PRIMARY |

---

## Step 4 — Set MAINNET_ENABLED

The `render.yaml` already sets `MAINNET_ENABLED=true`. To disable temporarily:
- Go to trustvexa-shared env group → change to `false`

---

## Step 5 — Configure Custom Domain

In Render Dashboard:
1. `trustvexa-web` → Settings → Custom Domains → Add `trustvexa.com` and `www.trustvexa.com`
2. `trustvexa-api` → Settings → Custom Domains → Add `api.trustvexa.com`
3. Point your DNS (in Namecheap/Cloudflare):
   ```
   @ (root)  CNAME  trustvexa-web.onrender.com
   www       CNAME  trustvexa-web.onrender.com
   api       CNAME  trustvexa-api.onrender.com
   ```
4. Render auto-provisions SSL certificates (Let's Encrypt)

---

## Step 6 — DB Migrations

Migrations run automatically via `preDeployCommand` in `render.yaml` before each API deploy.

If you need to run manually:
```bash
DATABASE_URL=<render-postgres-url> pnpm --filter @trustvexa/db run migrate:up
```

---

## Step 7 — First Deploy Checklist

After all services are green:
- [ ] Open `https://trustvexa.com` → register a test user
- [ ] Log in as `admin@trustvexa.io` (middleman) → visit `/middleman`
- [ ] Create a test connection → verify "Contact Middleman" routes to mm_admin
- [ ] Create a test deal → verify escrow address shows for chosen coin/network
- [ ] Test image upload in chat
- [ ] Verify `/healthz` returns 200 for both web and api

---

## Architecture Summary

```
trustvexa.com          → Next.js 15 (SSR + API routes)
api.trustvexa.com      → Express API (REST + Socket.IO)
                       → PostgreSQL (all escrow/deal/user data)
                       → Redis (sessions, rate limits, realtime pub/sub)
                       → BullMQ Worker (emails, blockchain watcher, payouts)
```

## Middleman Credentials
- **URL:** https://trustvexa.com/middleman
- **Email:** admin@trustvexa.io
- **Password:** Tr@deGuard2024!
- **Role:** middleman (operator-provisioned, cannot self-register)

---

## Production Readiness Checklist

| Feature | Status | Notes |
|---------|--------|-------|
| User registration/login | ✅ Ready | HIBP breach check active |
| Google OAuth | ⚠️ Needs config | Set GOOGLE_OAUTH_CLIENT_ID |
| Deal creation | ✅ Ready | Mainnet ON |
| Escrow addresses | ✅ Ready | EVM/TRON/SOL wallets configured |
| Chat (pre-deal) | ✅ Ready | 3-channel system, real-time |
| Deal chats | ✅ Ready | buyer↔seller, buyer↔mm, seller↔mm |
| Image uploads | ⚠️ Needs S3 | Local disk only until S3 configured |
| Email notifications | ⚠️ Needs SMTP | Set MAIL_* vars |
| Middleman dashboard | ✅ Ready | Full console at /middleman |
| Disputes | ✅ Ready | Full resolve flow |
| Feature flags | ✅ Ready | 15 flags seeded |
| Public reviews | ✅ Ready | |
| Push notifications | ⚠️ Needs VAPID | Set VAPID_* keys |
| Blockchain deposit watcher | ⚠️ Free RPCs | Replace with paid for production |
| Payout processing | ⚠️ Manual | Needs chain signer keys |
| HTTPS/SSL | ✅ Auto | Render provisions certs |
