# Incident Response & Breach Notification Plan

_(task 9.3, Requirements 47.1-47.4, 46.5, 46.6)_

## 1. Severity levels

| Level | Definition | Examples |
| --- | --- | --- |
| SEV-1 | Funds at risk / active exploit / data breach | Hot-wallet drain, key compromise, DB exfiltration |
| SEV-2 | Degraded safety controls | Reconciliation mismatch, payout halted, auth bypass attempt |
| SEV-3 | Limited/contained issue | Single failed payout, elevated error rate |

## 2. Immediate actions (first 30 minutes)

1. **Engage the kill switch** — middleman triggers the matching emergency pause
   (`new_deals` / `deposits` / `payouts` / `withdrawals` / `signups` / `chain`).
   The maintenance banner appears automatically; every pause is logged in
   `incident_pauses`.
2. **Freeze payouts** if any monetary integrity is in doubt.
3. **Capture evidence** — snapshot logs, `escrow_logs`, `admin_actions`
   (hash-chained), and relevant ledger entries before remediation.
4. **Open an incident channel** and assign an Incident Commander.

## 3. Containment & eradication

- Rotate any potentially exposed secret (KEK, JWT secrets, OAuth, mail, wallet
  signing keys). Re-issue from offline key material.
- Disable affected feature flags / chains via `feature_flags`.
- Patch the root cause; deploy via the protected `main` pipeline (green CI
  required, including the security stages).

## 4. Recovery

- Restore from the latest verified backup if data integrity is compromised
  (see `backup_jobs` + scheduled restore tests; RPO 24h / RTO 4h targets).
- Reconcile ledger vs on-chain balances before lifting payout pauses.
- Lift pauses scope-by-scope once each is independently verified safe.

## 5. Breach notification

- Assess scope of affected users and data categories.
- Notify affected users and applicable authorities within the legally required
  window (e.g. GDPR 72 hours where applicable).
- Publish a transparent post-incident report.

## 6. Post-incident review

- Blameless retro within 5 business days.
- File follow-up tasks; add regression tests and (where applicable) a new
  property-based or critical-flow test.
