# Domain & Anti-Phishing Hardening

_(task 9.3, Requirements 46.1-46.3, 47.5)_

## Branch protection (`main`)

- Require pull-request review (>= 1 approval) before merge.
- Require the `security` workflow (secret-scan, SCA, SAST) to pass.
- Require linear history and signed commits.
- Dismiss stale approvals on new commits; no force-push; no deletion.

## DNS / domain hardening

- **DNSSEC** enabled at the registrar and DNS provider.
- **CAA** records restricting issuance to the chosen CA.
- **Registrar lock** (clientTransferProhibited / clientUpdateProhibited).
- **SPF / DKIM / DMARC** (`p=reject`) on all sending domains.
- **MTA-STS** + TLS-RPT for inbound mail security.

## Web edge / CDN (Cloudflare)

- WAF with OWASP ruleset + rate limiting at the edge.
- Bot management on auth, signup, and contact endpoints.
- Strict HTTPS (HSTS preload), TLS 1.2+ only.
- Security headers: CSP, X-Content-Type-Options, Referrer-Policy,
  Permissions-Policy, X-Frame-Options DENY.

## Anti-phishing

- Publish `/.well-known/security.txt` (RFC 9116).
- Brand-protection monitoring for look-alike domains.
- Never send secrets, seed phrases, or full deposit addresses over email;
  in-app verification only.
- User education banner on the Trust & Security Center.

## Secret management

- No secrets in the repo (enforced by gitleaks; see `.gitleaks.toml`).
- All runtime secrets injected via the platform secret store.
- Offline-generated wallet signing keys; KEK never leaves secure storage.
