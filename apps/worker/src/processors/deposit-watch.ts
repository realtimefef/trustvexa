/**
 * Blockchain deposit-watch processor.
 *
 * The missing piece that makes deals auto-fund: a repeatable sweep that loads
 * every escrow address awaiting funding, queries each on its own chain through
 * the {@link ChainClient} adapter seam, and reuses the API's PURE money logic to
 * decide what to do — `classifyDeposit` (matched/underpaid/overpaid/
 * wrong_network/wrong_coin/fake_token), the per-chain confirmation thresholds
 * (ETH 12 / BNB 15 / Tron 20 / Solana finalized, scaled by risk tier), and the
 * idempotent `(tx_hash, output_index)` deposit upsert. Reorgs are detected by
 * re-checking confirmations of already-recorded deposits and recording a
 * `chain_reorg_events` row when a credited tx drops below threshold or vanishes.
 *
 * No RPC library is a dependency of this service: when a chain's RPC env vars
 * are absent or its optional library cannot be imported, the watcher logs and
 * SKIPS that chain, and manual tx-hash verification remains the fallback.
 */
import { Queue, type Job } from 'bullmq';
import { createRedisConnection } from '@trustvexa/shared/redis';
import type { ProcessorContext } from './index.js';
import {
  confirmations as confirm,
  depositClassification as classify,
  depositRepo,
  escrowAddressRepo,
  escrowAddressView,
  openPii,
  precision,
  payoutRepo,
} from '@trustvexa/api/worker-jobs';
import { parseDepositWatchJob, type DepositWatchNetwork } from '../payloads.js';
import {
  loadChainClient,
  isSupportedNetwork,
  type ChainClient,
  type Network,
  type ObservedTransfer,
} from '../chains/chain-client.js';

/** Map a deal risk score to the confirmation risk tier (deeper confs when risky). */
function riskTierForScore(score: number | null): confirm.RiskTier {
  if (score === null) return 'normal';
  if (score >= 70) return 'suspicious';
  if (score >= 40) return 'large';
  return 'normal';
}

/** Parse a PG numeric/bigint string to a finite number (0 on absence/garbage). */
function pctOf(value: string | null): number {
  if (value === null) return 0;
  const n = Number.parseFloat(value);
  return Number.isFinite(n) ? n : 0;
}

/** Build a confirmation state for the threshold/reorg predicates. */
function toConfirmationState(
  network: Network,
  result: number | 'finalized',
): confirm.ConfirmationState {
  if (result === 'finalized') {
    return { chain: network, confirmations: confirm.baseThreshold(network), finalized: true };
  }
  return { chain: network, confirmations: result, finalized: false };
}

/** A credited deposit row whose status indicates funds were recorded. */
const CREDITED_STATUSES: ReadonlySet<string> = new Set(['credited', 'confirmed']);

interface SweepSummary {
  pendingAddresses: number;
  chainsQueried: number;
  chainsSkipped: number;
  transfersSeen: number;
  credited: number;
  reorgs: number;
}

export async function processDepositWatch(job: Job, ctx: ProcessorContext): Promise<void> {
  const data = parseDepositWatchJob(job.data);
  const filter: ReadonlySet<DepositWatchNetwork> | null =
    data.networks === undefined ? null : new Set(data.networks);

  const pending = await escrowAddressRepo.listEscrowAddressesAwaitingFunding(ctx.db);
  const summary: SweepSummary = {
    pendingAddresses: pending.length,
    chainsQueried: 0,
    chainsSkipped: 0,
    transfersSeen: 0,
    credited: 0,
    reorgs: 0,
  };

  // Resolve one ChainClient per distinct network (null => skip that chain).
  const clients = new Map<Network, ChainClient | null>();
  for (const row of pending) {
    if (!isSupportedNetwork(row.network)) continue;
    if (filter !== null && !filter.has(row.network as DepositWatchNetwork)) continue;
    if (clients.has(row.network)) continue;
    const client = await loadChainClient(row.network, process.env);
    clients.set(row.network, client);
    if (client === null) {
      summary.chainsSkipped += 1;
      ctx.logger.warn(
        { network: row.network },
        'deposit-watch: chain RPC not configured/available — skipping (manual verification fallback)',
      );
    } else {
      summary.chainsQueried += 1;
    }
  }

  for (const row of pending) {
    if (!isSupportedNetwork(row.network)) continue;
    if (filter !== null && !filter.has(row.network as DepositWatchNetwork)) continue;
    const client = clients.get(row.network) ?? null;
    if (client === null) continue; // skipped chain
    if (row.amount_smallest_unit === null) continue; // no funding snapshot yet

    const network = row.network;
    const tier = riskTierForScore(row.risk_score);
    const expected: classify.ExpectedDeposit = {
      coin: row.coin,
      network,
      amountSmallestUnit: BigInt(row.amount_smallest_unit),
      tolerancePct: pctOf(row.price_tolerance_pct),
    };

    try {
      const [transfers, allowlistRows] = await Promise.all([
        client.getIncomingTransfers(row.address, row.coin, network),
        depositRepo.loadActiveAllowlist(ctx.db, row.coin, network),
      ]);
      const allowlist: classify.AllowlistEntry[] = allowlistRows.map((a) => ({
        coin: a.coin,
        network: a.network,
        contractAddress: a.contract_address,
        isActive: a.is_active,
      }));

      for (const transfer of transfers) {
        summary.transfersSeen += 1;
        const credited = await creditTransfer(ctx, {
          dealId: row.deal_id,
          network,
          tier,
          expected,
          allowlist,
          transfer,
        });
        if (credited) summary.credited += 1;
      }

      const reorgs = await detectReorgs(ctx, client, network, tier, row.deal_id);
      summary.reorgs += reorgs;
    } catch (err) {
      ctx.logger.error(
        {
          network,
          deal_id: row.deal_id,
          err: err instanceof Error ? err.message : String(err),
        },
        'deposit-watch: chain query failed for escrow address',
      );
    }
  }

  ctx.logger.info(summary, 'deposit-watch sweep complete');
}

interface CreditArgs {
  dealId: string;
  network: Network;
  tier: confirm.RiskTier;
  expected: classify.ExpectedDeposit;
  allowlist: classify.AllowlistEntry[];
  transfer: ObservedTransfer;
}

/**
 * Classify a single observed transfer and persist it idempotently. Returns true
 * when the transfer both classifies as creditable AND meets the confirmation
 * threshold (i.e. the deal is now funded by this deposit).
 */
async function enqueueEmail(to: string, subject: string, html: string): Promise<void> {
  const connection = createRedisConnection();
  const queue = new Queue('email', { connection });
  try {
    await queue.add('send-email', { to, subject, html });
  } finally {
    await queue.close();
  }
}

async function enqueueNotification(
  userId: string,
  dealId: string,
  eventType: string,
  payload: Record<string, unknown>,
): Promise<void> {
  const connection = createRedisConnection();
  const queue = new Queue('notification-fanout', { connection });
  try {
    await queue.add('fanout', {
      eventType,
      dealId,
      recipientUserIds: [userId],
      payload,
    });
  } finally {
    await queue.close();
  }
}

/**
 * Classify a single observed transfer and persist it idempotently. Returns true
 * when the transfer both classifies as creditable AND meets the confirmation
 * threshold (i.e. the deal is now funded by this deposit).
 */
async function creditTransfer(ctx: ProcessorContext, args: CreditArgs): Promise<boolean> {
  const { dealId, network, tier, expected, allowlist, transfer } = args;
  const incoming: classify.IncomingTransfer = {
    coin: transfer.coin,
    network,
    amountSmallestUnit: transfer.amountSmallestUnit,
    ...(transfer.tokenContractAddress !== undefined
      ? { tokenContractAddress: transfer.tokenContractAddress }
      : {}),
  };
  const classification = classify.classifyDeposit(expected, incoming, allowlist);

  const state = toConfirmationState(
    network,
    transfer.finalized === true ? 'finalized' : transfer.confirmations,
  );
  const meets = confirm.meetsThreshold(state, tier);
  const fundedNow = classification.credited && meets;

  const status = !classification.credited
    ? classification.status // wrong_network | wrong_coin | fake_token | underpaid
    : fundedNow
      ? 'credited'
      : 'awaiting_confirmations';

  const existingPayment = await ctx.db.query<{ status: string }>(
    `SELECT status FROM payments WHERE tx_hash = $1 AND output_index = $2 LIMIT 1`,
    [transfer.txHash, transfer.outputIndex],
  );
  const isNewOrChanged =
    existingPayment.rows.length === 0 || existingPayment.rows[0]?.status !== status;

  await ctx.withTransaction((tx) =>
    depositRepo.upsertPayment(tx, {
      dealId,
      coin: transfer.coin,
      network,
      tokenContractId: null,
      txHash: transfer.txHash,
      outputIndex: transfer.outputIndex,
      amountCoin: transfer.amountSmallestUnit.toString(),
      amountSmallestUnit: transfer.amountSmallestUnit,
      confirmations: transfer.confirmations,
      direction: 'in',
      matchStatus: classification.status,
      status,
      explorerUrl: escrowAddressView.explorerTxUrl(network, transfer.txHash),
    }),
  );

  if (isNewOrChanged) {
    try {
      const connection = createRedisConnection();
      await connection.publish(
        'realtime:deal:events',
        JSON.stringify({
          dealId,
          event: 'confirmation:tick',
          payload: {
            dealId,
            confirmations: transfer.confirmations,
            required: confirm.baseThreshold(network),
          },
        }),
      );
      await connection.quit();
    } catch {
      // ignore
    }

    if (status === 'credited') {
      // MED-MONEY-4 FIX: Use full txHash + outputIndex in the requestId to
      // prevent collision when two transfers share the same first-8 chars of hash
      // AND are processed within the same millisecond.
      try {
        const { applyDealTransition } = await import('@trustvexa/api/deal-lifecycle');
        await applyDealTransition({
          dealId,
          event: 'FundsHeld',
          actorId: null,
          requestId: `system-deposit-watch:${transfer.txHash}:${transfer.outputIndex}`,
        });
      } catch (err) {
        ctx.logger.error(
          { err: err instanceof Error ? err.message : String(err), dealId },
          'deposit-watch: failed to transition deal to Funded',
        );
      }

      try {
        const dealResult = await ctx.db.query<{ buyer_id: string }>(
          `SELECT buyer_id FROM deals WHERE id = $1 LIMIT 1`,
          [dealId],
        );
        const deal = dealResult.rows[0];
        if (deal && deal.buyer_id) {
          const connection = createRedisConnection();
          await connection.publish(
            'realtime:wallet:events',
            JSON.stringify({
              userId: deal.buyer_id,
              event: 'wallet:balance_updated',
              payload: { userId: deal.buyer_id, dealId },
            }),
          );
          await connection.quit();
        }
      } catch {
        // ignore
      }
    }

    if (status === 'underpaid') {
      try {
        const dealResult = await ctx.db.query<{ buyer_id: string; title: string }>(
          `SELECT buyer_id, title FROM deals WHERE id = $1 LIMIT 1`,
          [dealId],
        );
        const deal = dealResult.rows[0];
        if (deal && deal.buyer_id) {
          const buyerResult = await ctx.db.query<{ username: string; email_enc: string | null }>(
            `SELECT username, email_enc FROM users WHERE id = $1 LIMIT 1`,
            [deal.buyer_id],
          );
          const buyer = buyerResult.rows[0];
          if (buyer) {
            const rule = precision.getPrecisionRule(transfer.coin, network);
            const expectedAmountCoin = precision.fromSmallestUnit(
              expected.amountSmallestUnit,
              rule.decimals,
            );
            const receivedAmountCoin = precision.fromSmallestUnit(
              transfer.amountSmallestUnit,
              rule.decimals,
            );
            const shortfallCoin = precision.fromSmallestUnit(
              classification.shortfallSmallestUnit,
              rule.decimals,
            );

            let buyerEmail = '';
            if (buyer.email_enc) {
              buyerEmail = (await openPii(buyer.email_enc)) ?? '';
            }

            const subject = 'Deposit Underpaid Alert';
            const html = `
              <div style="background-color: #0b0f19; color: #f3f4f6; font-family: sans-serif; padding: 40px 0;">
                <div style="max-width: 600px; margin: 0 auto; background-color: #111827; border: 1px solid #1f2937; border-radius: 12px; overflow: hidden;">
                  <div style="padding: 30px; text-align: center; background: linear-gradient(135deg, #1e1b4b 0%, #311042 100%);">
                    <a href="https://trustvexa.com" style="font-size: 24px; font-weight: bold; color: #6366f1; text-decoration: none;">Trust<span style="color: #a855f7;">Vexa</span></a>
                  </div>
                  <div style="padding: 40px 30px; line-height: 1.6;">
                    <h1 style="color: #ffffff; font-size: 22px;">Deposit Underpaid</h1>
                    <p style="color: #9ca3af;">Hi ${buyer.username},</p>
                    <p style="color: #9ca3af;">We detected a deposit for your deal: <strong>${deal.title}</strong>, but the amount received was less than expected.</p>
                    <div style="background-color: #7c2d12; border: 1px solid #c2410c; border-radius: 8px; padding: 20px; margin-bottom: 24px; text-align: center;">
                      <div style="color: #ffedd5; font-size: 14px; margin-bottom: 5px;">Expected Amount</div>
                      <div style="color: #ffffff; font-size: 20px; font-weight: bold; margin-bottom: 15px;">${expectedAmountCoin} ${transfer.coin}</div>
                      <div style="color: #ffedd5; font-size: 14px; margin-bottom: 5px;">Received Amount</div>
                      <div style="color: #f87171; font-size: 20px; font-weight: bold; margin-bottom: 15px;">${receivedAmountCoin} ${transfer.coin}</div>
                      <div style="color: #ffedd5; font-size: 14px; margin-bottom: 5px;">Shortfall (Remaining)</div>
                      <div style="color: #facc15; font-size: 20px; font-weight: bold;">${shortfallCoin} ${transfer.coin}</div>
                    </div>
                    <p style="color: #9ca3af;">Please deposit the remaining shortfall of <strong>${shortfallCoin} ${transfer.coin}</strong> to the same escrow address to fund your deal.</p>
                    <div style="text-align: center; margin-top: 30px;">
                      <a href="https://trustvexa.com/deals/${dealId}" style="display: inline-block; padding: 12px 24px; background-color: #6366f1; color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: 600;">View Deal Room</a>
                    </div>
                  </div>
                </div>
              </div>
            `;

            if (buyerEmail) {
              await enqueueEmail(buyerEmail, subject, html);
            }

            await enqueueNotification(deal.buyer_id, dealId, 'payment:received', {
              status: 'underpaid',
              expected: expectedAmountCoin,
              received: receivedAmountCoin,
              shortfall: shortfallCoin,
              coin: transfer.coin,
            });
          }
        }
      } catch (err) {
        ctx.logger.error(
          { err: err instanceof Error ? err.message : String(err) },
          'Failed to process underpayment notification',
        );
      }
    } else if (status === 'credited' && classification.status === 'overpaid') {
      try {
        const dealResult = await ctx.db.query<{ buyer_id: string }>(
          `SELECT buyer_id FROM deals WHERE id = $1 LIMIT 1`,
          [dealId],
        );
        const deal = dealResult.rows[0];
        if (deal && deal.buyer_id) {
          const rule = precision.getPrecisionRule(transfer.coin, network);
          const excessAmountCoin = precision.fromSmallestUnit(
            classification.refundExcessSmallestUnit,
            rule.decimals,
          );

          const addressResult = await ctx.db.query<{ address_enc: string }>(
            `SELECT address_enc FROM user_payout_addresses WHERE user_id = $1 AND coin = $2 AND network = $3 LIMIT 1`,
            [deal.buyer_id, transfer.coin, network],
          );
          let buyerRefundAddress = '';
          const row = addressResult.rows[0];
          if (row && row.address_enc) {
            buyerRefundAddress = (await openPii(row.address_enc)) ?? '';
          }

          // MONEY-HIGH-5 FIX: If the buyer has no configured payout address, do NOT
          // enqueue a payout with an empty address — that creates an un-resolvable
          // 'pending' payout row. Instead, log a high-severity alert and skip.
          if (!buyerRefundAddress) {
            ctx.logger.error(
              { dealId, buyerId: deal.buyer_id, excessAmountCoin },
              'deposit-watch: overpayment refund skipped — buyer has no configured payout address. Manual admin intervention required.',
            );
          } else {
            await ctx.withTransaction(async (tx) => {
              await payoutRepo.enqueuePayout(tx, {
                dealId,
                payeeId: deal.buyer_id,
                coin: transfer.coin,
                network,
                address: buyerRefundAddress,
                amountCoin: excessAmountCoin,
                amountSmallestUnit: classification.refundExcessSmallestUnit,
                holdUntil: null,
              });
            });
          }
        }
      } catch (err) {
        ctx.logger.error(
          { err: err instanceof Error ? err.message : String(err) },
          'Failed to process overpayment refund',
        );
      }
    }
  }

  return fundedNow;
}

/**
 * Re-check confirmations of already-recorded inbound deposits for a deal. When a
 * previously-credited tx drops below threshold or can no longer be found, record
 * a reorg event and mark the payment reorged. Returns the number of reorgs.
 */
async function detectReorgs(
  ctx: ProcessorContext,
  client: ChainClient,
  network: Network,
  tier: confirm.RiskTier,
  dealId: string,
): Promise<number> {
  const existing = await depositRepo.listInboundDeposits(ctx.db, dealId);
  let reorgs = 0;

  for (const payment of existing) {
    const wasCredited = payment.status !== null && CREDITED_STATUSES.has(payment.status);
    if (!wasCredited) continue;

    const result = await client.getConfirmations(payment.tx_hash);
    const state = toConfirmationState(network, result);
    if (confirm.meetsThreshold(state, tier)) continue; // still funded — no reorg

    await ctx.withTransaction(async (tx) => {
      await depositRepo.recordReorgEvent(tx, {
        paymentId: payment.id,
        dealId,
        txHash: payment.tx_hash,
        previousStatus: payment.status ?? 'credited',
        newStatus: 'reorged',
      });
      await depositRepo.updateDepositStatus(tx, payment.id, state.confirmations, 'reorged');
    });
    reorgs += 1;
    ctx.logger.warn(
      { network, deal_id: dealId, tx_hash: payment.tx_hash },
      'deposit-watch: reorg detected — credited deposit dropped below threshold',
    );
  }

  return reorgs;
}
