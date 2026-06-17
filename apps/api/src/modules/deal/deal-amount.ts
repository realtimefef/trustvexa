/**
 * Deal-amount bounds (Plan §18.10–18.11) — Property 11.
 *
 * Bounds are USD, held as integer cents (server-authoritative, never floats).
 * $400.00 = 40_000 cents; $50,000.00 = 5_000_000 cents. Inclusive on both ends.
 * (Requirements 18.10, 18.11)
 */
export const MIN_DEAL_AMOUNT_CENTS = 40_000;
export const MAX_DEAL_AMOUNT_CENTS = 5_000_000;

export function isDealAmountWithinBounds(amountCents: number): boolean {
  return (
    Number.isInteger(amountCents) &&
    amountCents >= MIN_DEAL_AMOUNT_CENTS &&
    amountCents <= MAX_DEAL_AMOUNT_CENTS
  );
}

export class DealAmountOutOfBoundsError extends Error {
  readonly amountCents: number;

  constructor(amountCents: number) {
    super(
      `Deal amount ${amountCents} cents is outside the allowed range ` +
        `[${MIN_DEAL_AMOUNT_CENTS}, ${MAX_DEAL_AMOUNT_CENTS}]`,
    );
    this.name = 'DealAmountOutOfBoundsError';
    this.amountCents = amountCents;
  }
}

export function assertDealAmountWithinBounds(amountCents: number): void {
  if (!isDealAmountWithinBounds(amountCents)) {
    throw new DealAmountOutOfBoundsError(amountCents);
  }
}
