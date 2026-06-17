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
/**
 * Classify item text. Prohibited matches dominate (a single hit blocks); if
 * nothing is prohibited, any risky match routes to review.
 */
export declare function screenItem(input: ScreenInput): ScreenResult;
//# sourceMappingURL=prohibited-items.d.ts.map