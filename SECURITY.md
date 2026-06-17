# Security Policy

TrustVexa handles real funds and sensitive personal data. We take security seriously and
appreciate responsible disclosure.

## Supported versions

The platform is under active development. Security fixes are applied to the `main`
branch and the currently deployed release.

| Version | Supported |
| ------- | --------- |
| `main` / latest deploy | ✅ |
| older builds | ❌ |

## Reporting a vulnerability

**Please do not open a public GitHub issue, pull request, or discussion for security
vulnerabilities.**

Instead, report privately:

- Email: **security@trustvexa.com** (replace with the operator's real security contact)
- Or use GitHub’s **“Report a vulnerability”** (Security → Advisories) if enabled.

Please include:

- A clear description of the issue and its impact
- Steps to reproduce (proof-of-concept where possible)
- Affected component(s), endpoints, or commit
- Any suggested remediation

### What to expect

- **Acknowledgement:** within 3 business days.
- **Triage & severity assessment:** within 7 business days.
- **Fix timeline:** communicated after triage; critical issues are prioritized.
- We will keep you updated and credit you (with your permission) once resolved.

## Scope

In scope: the application code in this repository (web, api, worker, shared, db),
authentication, money/ledger logic, deal state machine, and deployment configuration.

Out of scope: third-party services (Render, RPC providers, mail/S3 vendors), social
engineering, physical attacks, and volumetric DDoS.

## Safe harbor

Good-faith research that respects user privacy, avoids service disruption, and does not
access or modify data beyond what is necessary to demonstrate a vulnerability will not
be pursued legally. Do not exfiltrate data, pivot to other systems, or run automated
scans against production without prior written permission.

## Handling money & secrets

- Never test against real funds. Use **practice (testnet) mode**.
- Never include real secrets, keys, or personal data in a report — redact them.

For production hardening and incident handling, see
[`docs/security-hardening.md`](docs/security-hardening.md) and
[`docs/incident-response.md`](docs/incident-response.md).
