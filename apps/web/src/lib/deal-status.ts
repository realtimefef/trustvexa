/**
 * Display helpers for deal status and party role. The server is the source of
 * truth for the 20 lifecycle statuses (apps/api/src/modules/deal/state-machine.ts);
 * these helpers only map a status code to a human label and a badge color.
 */
import type { DealRole } from '@/lib/api/types';

type BadgeVariant = 'default' | 'secondary' | 'destructive' | 'outline' | 'success' | 'warning';

// Statuses that represent healthy forward progress / completion.
const POSITIVE_STATUSES = new Set<string>([
  'Confirmed',
  'Funded',
  'SellerHandover',
  'MiddlemanVerified',
  'Delivered',
  'Approved',
  'PayoutQueued',
  'MilestoneReleased',
  'Released',
]);

// Statuses that need attention or represent an unhappy/terminal path.
const CAUTION_STATUSES = new Set<string>([
  'Disputed',
  'Paused',
  'Expired',
  'Cancelled',
  'Refunded',
  'PartiallySettled',
]);

/** Badge color for a deal status. */
export function dealStatusVariant(status: string): BadgeVariant {
  if (POSITIVE_STATUSES.has(status)) return 'success';
  if (CAUTION_STATUSES.has(status)) return 'warning';
  return 'secondary';
}

/** Turn a PascalCase status code into a spaced label (SellerHandover -> Seller Handover). */
export function dealStatusLabel(status: string): string {
  // The "SellerHandover" state is, from the parties' point of view, the moment
  // the middleman takes over to verify + deliver, so we surface it as
  // "Middleman handover" rather than the internal code's literal split.
  if (status === 'SellerHandover') return 'Middleman handover';
  return status.replace(/([a-z0-9])([A-Z])/g, '$1 $2');
}

const ROLE_LABELS: Record<DealRole, string> = {
  buyer: 'Buyer',
  seller: 'Seller',
  middleman: 'Middleman',
};

/** Human label for the user's party role on a deal. */
export function roleLabel(role: DealRole): string {
  return ROLE_LABELS[role];
}
