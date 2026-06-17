/**
 * Prohibited-item screening (task 4.2, Requirements 9.1-9.3).
 *
 * A pure, side-effect-free classifier so it is trivially unit/property
 * testable and reusable on the client for pre-submit hints. It inspects the
 * free-text item description / terms and returns one of three decisions:
 *
 *   - `block`  -> a prohibited category matched; creation must be rejected.
 *   - `review` -> a risky keyword / suspicious type matched; the deal is routed
 *                 to middleman review before funding (Requirement 9.2).
 *   - `allow`  -> nothing matched.
 *
 * Matching is conservative: multi-word / hyphenated phrases match as
 * substrings on normalized text, while single words use word boundaries so
 * `gun` does not trip on `begun`.
 */

export type ScreenDecision = 'allow' | 'review' | 'block';

export interface ScreenFlag {
  readonly flagType: string;
  readonly severity: 'block' | 'review';
  readonly details: string;
}

export interface ScreenResult {
  readonly decision: ScreenDecision;
  readonly flags: ScreenFlag[];
  readonly riskScore: number;
}

export interface ScreenInput {
  readonly text: string;
  readonly productType?: 'digital' | 'account';
}

interface PatternGroup {
  readonly category: string;
  readonly terms: readonly string[];
}

/** Hard-blocked categories (Requirement 9.3). */
const PROHIBITED_GROUPS: readonly PatternGroup[] = [
  {
    category: 'firearms_weapons',
    terms: [
      'firearm',
      'firearms',
      'gun',
      'guns',
      'rifle',
      'pistol',
      'handgun',
      'ammunition',
      'ammo',
      'ar-15',
      'ar15',
      'glock',
      'silencer',
      'explosive',
      'grenade',
      'bomb',
    ],
  },
  {
    category: 'drugs',
    terms: [
      'cocaine',
      'heroin',
      'meth',
      'methamphetamine',
      'mdma',
      'ecstasy',
      'lsd',
      'fentanyl',
      'narcotic',
      'narcotics',
      'marijuana',
      'weed',
      'cannabis',
      'illegal drugs',
    ],
  },
  {
    category: 'stolen_accounts_or_data',
    terms: [
      'stolen account',
      'stolen accounts',
      'stolen data',
      'hacked account',
      'hacked accounts',
      'cracked account',
      'leaked database',
      'database dump',
      'credit card dump',
      'cc dump',
      'fullz',
      'carding',
      'cvv dump',
      'dumps shop',
    ],
  },
  {
    category: 'bulk_social_accounts',
    terms: [
      'bulk accounts',
      'bulk social',
      'bulk social accounts',
      'mass accounts',
      'account farm',
      'pva accounts',
      'phone verified accounts',
      'aged accounts bulk',
    ],
  },
  {
    category: 'illegal_or_against_law',
    terms: [
      'counterfeit',
      'fake id',
      'fake ids',
      'forged document',
      'forged documents',
      'child porn',
      'csam',
      'underage',
      'human trafficking',
      'organ',
      'hitman',
      'assassination',
    ],
  },
];

/** Risky keywords / suspicious types routed to middleman review (Requirement 9.2). */
const RISKY_GROUPS: readonly PatternGroup[] = [
  {
    category: 'social_media_account',
    terms: [
      'instagram account',
      'facebook account',
      'tiktok account',
      'twitter account',
      'x account',
      'snapchat account',
      'youtube account',
      'telegram account',
      'social media account',
      'followers',
    ],
  },
  {
    category: 'financial_account',
    terms: [
      'paypal',
      'bank account',
      'bank login',
      'stripe account',
      'cashapp',
      'venmo',
      'wise account',
      'revolut',
    ],
  },
  {
    category: 'gift_card',
    terms: ['gift card', 'gift cards', 'giftcard', 'gift-card'],
  },
  {
    category: 'game_account',
    terms: [
      'steam account',
      'fortnite account',
      'game account',
      'gaming account',
      'in-game',
      'riot account',
      'epic account',
      'valorant account',
    ],
  },
  {
    category: 'crypto_credentials',
    terms: ['seed phrase', 'private key', 'wallet seed', 'recovery phrase', 'keystore'],
  },
  {
    category: 'software_license',
    terms: ['license key', 'serial key', 'activation key', 'product key', 'cd key'],
  },
];

function normalize(text: string): string {
  return text.toLowerCase().replace(/\s+/g, ' ').trim();
}

function termMatches(haystack: string, term: string): boolean {
  if (term.includes(' ') || term.includes('-')) {
    return haystack.includes(term);
  }
  const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`\\b${escaped}\\b`).test(haystack);
}

function matchGroups(
  haystack: string,
  groups: readonly PatternGroup[],
  prefix: string,
  severity: 'block' | 'review',
): ScreenFlag[] {
  const flags: ScreenFlag[] = [];
  for (const group of groups) {
    const hits = group.terms.filter((t) => termMatches(haystack, t));
    if (hits.length > 0) {
      flags.push({
        flagType: `${prefix}:${group.category}`,
        severity,
        details: `Matched ${severity === 'block' ? 'prohibited' : 'risky'} terms: ${hits.join(', ')}`,
      });
    }
  }
  return flags;
}

/**
 * Classify item text. Prohibited matches dominate (a single hit blocks); if
 * nothing is prohibited, any risky match routes to review.
 */
export function screenItem(input: ScreenInput): ScreenResult {
  const haystack = normalize(input.text);
  if (haystack === '') {
    return { decision: 'allow', flags: [], riskScore: 0 };
  }

  const blockFlags = matchGroups(haystack, PROHIBITED_GROUPS, 'prohibited', 'block');
  if (blockFlags.length > 0) {
    return { decision: 'block', flags: blockFlags, riskScore: 100 };
  }

  const reviewFlags = matchGroups(haystack, RISKY_GROUPS, 'risky', 'review');
  if (reviewFlags.length > 0) {
    const riskScore = Math.min(90, 40 + (reviewFlags.length - 1) * 15);
    return { decision: 'review', flags: reviewFlags, riskScore };
  }

  return { decision: 'allow', flags: [], riskScore: 0 };
}
