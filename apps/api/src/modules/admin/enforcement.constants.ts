/** Account-label tier values (mirrors the `account_label` DB enum). */
export const ACCOUNT_LABELS = [
  'new_user',
  'good_standing',
  'trusted',
  'high_risk',
  'middleman_verified',
] as const;

export type AccountLabel = (typeof ACCOUNT_LABELS)[number];
