// Feature: trustvexa-escrow-platform, Property 12: Incoming deposits are classified and never silently misfund
// Feature: trustvexa-escrow-platform, Property 13: Token deposits are credited only from allowlisted contracts
import fc from 'fast-check';
import { describe, expect, it } from 'vitest';

import {
  classifyDeposit,
  type AllowlistEntry,
  type ExpectedDeposit,
  type IncomingTransfer,
} from '../deposit-classification.js';

const USDT_CONTRACT = '0xdAC17F958D2ee523a2206206994597C13D831ec7';
const allowlist: AllowlistEntry[] = [
  { coin: 'USDT', network: 'ETH', contractAddress: USDT_CONTRACT, isActive: true },
];

describe('Property 12: deposits are classified and never silently misfunded', () => {
  it('only matched/overpaid credit escrow; wrong/under never auto-fund the wrong thing', () => {
    fc.assert(
      fc.property(
        fc.constantFrom('ETH', 'BNB', 'TRON', 'SOLANA'),
        fc.constantFrom('ETH', 'BNB', 'TRON', 'SOLANA'),
        fc.bigInt({ min: 1n, max: 10n ** 12n }),
        fc.bigInt({ min: 1n, max: 10n ** 12n }),
        (expNet, inNet, expAmt, inAmt) => {
          const expected: ExpectedDeposit = {
            coin: 'ETH',
            network: expNet,
            amountSmallestUnit: expAmt,
          };
          const incoming: IncomingTransfer = {
            coin: 'ETH',
            network: inNet,
            amountSmallestUnit: inAmt,
          };
          const r = classifyDeposit(expected, incoming);
          if (inNet !== expNet) {
            expect(r.status).toBe('wrong_network');
            expect(r.credited).toBe(false);
            return;
          }
          // Same network, same (native) coin: amount drives classification.
          if (inAmt < expAmt) expect(r.status).toBe('underpaid');
          else if (inAmt > expAmt) expect(r.status).toBe('overpaid');
          else expect(r.status).toBe('matched');
          // Underpaid never credits; overpaid funds expected + refunds the excess.
          if (r.status === 'underpaid') expect(r.credited).toBe(false);
          if (r.status === 'overpaid') {
            expect(r.creditAmountSmallestUnit).toBe(expAmt);
            expect(r.refundExcessSmallestUnit).toBe(inAmt - expAmt);
          }
          if (r.status === 'matched') expect(r.creditAmountSmallestUnit).toBe(inAmt);
        },
      ),
    );
  });

  it('flags wrong coin without crediting', () => {
    const r = classifyDeposit(
      { coin: 'ETH', network: 'ETH', amountSmallestUnit: 100n },
      { coin: 'BNB', network: 'ETH', amountSmallestUnit: 100n },
    );
    expect(r.status).toBe('wrong_coin');
    expect(r.credited).toBe(false);
  });
});

describe('Property 13: tokens credited only from allowlisted contracts', () => {
  it('credits a matched USDT deposit only from the active allowlisted contract', () => {
    fc.assert(
      fc.property(fc.hexaString({ minLength: 40, maxLength: 40 }), (hex) => {
        const contract = `0x${hex}`;
        const expected: ExpectedDeposit = {
          coin: 'USDT',
          network: 'ETH',
          amountSmallestUnit: 1_000_000n,
        };
        const incoming: IncomingTransfer = {
          coin: 'USDT',
          network: 'ETH',
          amountSmallestUnit: 1_000_000n,
          tokenContractAddress: contract,
        };
        const r = classifyDeposit(expected, incoming, allowlist);
        if (contract.toLowerCase() === USDT_CONTRACT.toLowerCase()) {
          expect(r.status).toBe('matched');
          expect(r.credited).toBe(true);
        } else {
          expect(r.status).toBe('fake_token');
          expect(r.credited).toBe(false);
        }
      }),
    );
  });

  it('rejects a token transfer with no contract address', () => {
    const r = classifyDeposit(
      { coin: 'USDT', network: 'ETH', amountSmallestUnit: 1_000_000n },
      { coin: 'USDT', network: 'ETH', amountSmallestUnit: 1_000_000n },
      allowlist,
    );
    expect(r.status).toBe('fake_token');
    expect(r.credited).toBe(false);
  });

  it('does not credit from an inactive allowlist entry', () => {
    const r = classifyDeposit(
      { coin: 'USDT', network: 'ETH', amountSmallestUnit: 1_000_000n },
      {
        coin: 'USDT',
        network: 'ETH',
        amountSmallestUnit: 1_000_000n,
        tokenContractAddress: USDT_CONTRACT,
      },
      [{ coin: 'USDT', network: 'ETH', contractAddress: USDT_CONTRACT, isActive: false }],
    );
    expect(r.status).toBe('fake_token');
    expect(r.credited).toBe(false);
  });
});
