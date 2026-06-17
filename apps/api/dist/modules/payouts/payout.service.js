/**
 * Payout approval/broadcast service (operator, two-step dual control).
 *
 * The seller payout is released in two confirmation steps, both performed by
 * the deal's assigned middleman (the 403 check mirrors `dispute.service`'s
 * `lockDealForSettlement` guard):
 *
 *   1. `approve`  — runs the ordered payout preflight and, when the substantive
 *                   checks pass, records the first control signature and moves
 *                   the payout `pending -> approved`. The final `two_step_signing`
 *                   check is the gate that step 2 completes, so it is not treated
 *                   as a blocker here.
 *   2. `broadcast` — re-runs the FULL preflight (including `two_step_signing`,
 *                   whose distinct-approver set is sourced from the real
 *                   `payout_preflight_checks.checked_by` column plus the
 *                   broadcaster). The payout is only marked `broadcast` when every
 *                   check passes; otherwise the failed check is returned and no
 *                   transition occurs.
 *
 * Both steps run through `runMoneyWrite`, so they are idempotent (Idempotency-Key),
 * optimistically locked (deal/payout `version_no`), and atomic.
 */
import { SUPPORTED_NETWORKS } from '@trustvexa/shared';
import { AppError, notFound } from '../../errors/app-error.js';
import { openPii } from '../crypto/key-provider.js';
import { enqueuePayoutProcessing } from '../../lib/queue.js';
import { lockDealVersion, runMoneyWrite } from '../money/money-write.js';
import { runPreflight, } from '../money/payout-preflight.js';
import { loadAllowlistStatus, loadOperatorCap, recordPreflightChecks, updatePayoutStatus, } from '../money/payout-queue.repository.js';
import { hasOpenDispute, isDealLedgerBalanced, isTokenContractAllowlisted, listPriorApprovers, lockDealForPayout, lockPayout, setPayoutPreflightStatus, } from './payouts-write.repository.js';
/** Deal statuses from which a seller payout may be released. */
const PAYABLE_DEAL_STATUSES = new Set(['Approved', 'PayoutQueued']);
/** USDT is the only token coin on the platform; the rest are native. */
function coinIsToken(coin) {
    return coin.toUpperCase() === 'USDT';
}
function assertAssignedMiddleman(deal, middlemanId) {
    if (deal.middleman_id !== middlemanId) {
        throw new AppError('forbidden', 'Only the assigned middleman can act on this payout.', 403);
    }
}
/**
 * Build the preflight context for a payout from real persisted state. Inputs
 * that have no dedicated column are sourced as faithfully as possible (see the
 * per-field notes); none are fabricated.
 */
async function buildPreflightContext(client, payout, deal, idempotencyKey, approverIds) {
    const amountSmallestUnit = BigInt(payout.amount_smallest_unit ?? '0');
    const nowIso = new Date().toISOString();
    const [openDispute, tokenAllowlisted, ledgerBalanced, allowlist, operatorCap] = await Promise.all([
        hasOpenDispute(client, deal.id),
        isTokenContractAllowlisted(client, payout.coin, payout.network),
        isDealLedgerBalanced(client, deal.id),
        loadAllowlistStatus(client, payout.coin, payout.network, payout.address ?? ''),
        loadOperatorCap(client, payout.coin, payout.network),
    ]);
    let hasPendingWalletChangeHold = false;
    if (payout.payee_id && payout.address) {
        const targetAddr = payout.address.trim().toLowerCase();
        const { rows } = await client.query(`SELECT new_address_enc, hold_until FROM wallet_change_requests
        WHERE user_id = $1 AND status = 'pending' AND hold_until > now()`, [payout.payee_id]);
        for (const r of rows) {
            const decrypted = await openPii(r.new_address_enc);
            if (decrypted && decrypted.trim().toLowerCase() === targetAddr) {
                hasPendingWalletChangeHold = true;
                break;
            }
        }
    }
    return {
        dealStatusEligible: PAYABLE_DEAL_STATUSES.has(deal.status),
        hasOpenDispute: openDispute,
        hasLegalHold: deal.legal_hold === true,
        address: payout.address,
        chainSupported: SUPPORTED_NETWORKS.includes(payout.network),
        isToken: coinIsToken(payout.coin),
        tokenContractAllowlisted: tokenAllowlisted,
        amountSmallestUnit,
        // No separate seller-payout-smallest-unit column exists on `deals`; the
        // queued `payout_queue.amount_smallest_unit` IS the snapshot amount locked
        // at enqueue, so the snapshot check verifies the queued amount is positive
        // and unchanged in-flight.
        snapshotPayoutSmallestUnit: amountSmallestUnit,
        // `payout_queue.gas_reserve_status` is the recorded gas-reserve check; an
        // unrecorded (null) status is treated as not-yet-blocking.
        gasReserveOk: payout.gas_reserve_status == null || payout.gas_reserve_status === 'ok',
        // When no operator cap row is configured for the coin/network, the cap does
        // not constrain this payout.
        operatorCapRemainingSmallestUnit: operatorCap
            ? operatorCap.remainingSmallestUnit
            : amountSmallestUnit,
        allowlistActiveFrom: allowlist && allowlist.isActive ? allowlist.activeFrom : null,
        hasPendingWalletChangeHold,
        nowIso,
        ledgerBalanced,
        idempotencyKey,
        approverIds,
    };
}
function toView(result) {
    return {
        authorized: result.authorized,
        failedCheck: result.failedCheck,
        results: result.results,
    };
}
/**
 * Approve (first control signature) a queued payout. Idempotent: re-approving
 * an already-approved payout returns the current state without erroring.
 */
export async function approvePayout(input) {
    const { result } = await runMoneyWrite({
        idempotencyKey: input.idempotencyKey,
        actionType: 'approve_payout',
        userId: input.middlemanId,
        payload: { payoutId: input.payoutId, action: 'approve' },
        work: async (client) => {
            const payout = await lockPayout(client, input.payoutId);
            if (payout === null)
                throw notFound('Payout was not found.');
            const deal = await lockDealForPayout(client, payout.deal_id);
            if (deal === null)
                throw notFound('Payout was not found.');
            assertAssignedMiddleman(deal, input.middlemanId);
            // Idempotent: already approved -> replay current state.
            if (payout.status === 'approved') {
                return {
                    payoutId: payout.id,
                    status: payout.status,
                    approved: true,
                    preflight: { authorized: true, failedCheck: null, results: [] },
                };
            }
            if (payout.status !== 'pending') {
                throw new AppError('payout_not_pending', `A payout in status '${payout.status}' cannot be approved.`, 409);
            }
            const approvers = [...(await listPriorApprovers(client, payout.id)), input.middlemanId];
            const ctx = await buildPreflightContext(client, payout, deal, input.idempotencyKey, approvers);
            const preflight = runPreflight(ctx);
            // The final two_step_signing gate is completed at broadcast; approval only
            // requires the substantive checks to pass.
            const blocking = preflight.failedCheck !== null && preflight.failedCheck !== 'two_step_signing';
            if (blocking) {
                await setPayoutPreflightStatus(client, payout.id, 'failed');
                return {
                    payoutId: payout.id,
                    status: payout.status,
                    approved: false,
                    preflight: toView(preflight),
                };
            }
            await recordPreflightChecks(client, payout.id, deal.id, input.middlemanId, preflight.results);
            const newVersion = await updatePayoutStatus(client, payout.id, payout.version_no, 'approved', null);
            if (newVersion === null) {
                throw new AppError('concurrent_update', 'The payout was modified concurrently; reload and retry.', 409);
            }
            await setPayoutPreflightStatus(client, payout.id, 'passed');
            return {
                payoutId: payout.id,
                status: 'approved',
                approved: true,
                preflight: toView(preflight),
            };
        },
    });
    return result;
}
/**
 * Broadcast (second control signature) an approved payout. Re-runs the full
 * preflight; only transitions `approved -> broadcast` when every check passes,
 * otherwise returns the failed check and leaves the payout untouched.
 * Idempotent: a payout already broadcast replays its current state.
 */
export async function broadcastPayout(input) {
    if (process.env.MAINNET_ENABLED !== 'true') {
        throw new AppError('mainnet_not_enabled', 'Payout broadcasting is disabled until the operator completes the go-live checklist.', 503);
    }
    const { result } = await runMoneyWrite({
        idempotencyKey: input.idempotencyKey,
        actionType: 'broadcast_payout',
        userId: input.middlemanId,
        payload: { payoutId: input.payoutId, action: 'broadcast' },
        work: async (client) => {
            const payout = await lockPayout(client, input.payoutId);
            if (payout === null)
                throw notFound('Payout was not found.');
            const deal = await lockDealForPayout(client, payout.deal_id);
            if (deal === null)
                throw notFound('Payout was not found.');
            assertAssignedMiddleman(deal, input.middlemanId);
            // Idempotent: already broadcast -> replay current state.
            if (payout.status === 'broadcast') {
                return {
                    payoutId: payout.id,
                    status: payout.status,
                    broadcast: true,
                    preflight: { authorized: true, failedCheck: null, results: [] },
                };
            }
            if (payout.status !== 'approved') {
                throw new AppError('payout_not_approved', `A payout in status '${payout.status}' cannot be broadcast; it must be approved first.`, 409);
            }
            const approvers = new Set([
                ...(await listPriorApprovers(client, payout.id)),
                input.middlemanId,
            ]);
            const ctx = await buildPreflightContext(client, payout, deal, input.idempotencyKey, [
                ...approvers,
            ]);
            const preflight = runPreflight(ctx);
            await recordPreflightChecks(client, payout.id, deal.id, input.middlemanId, preflight.results);
            // Do not broadcast if any preflight check fails — return the failed check.
            if (!preflight.authorized) {
                await setPayoutPreflightStatus(client, payout.id, 'failed');
                return {
                    payoutId: payout.id,
                    status: payout.status,
                    broadcast: false,
                    preflight: toView(preflight),
                };
            }
            // Optimistic lock on the deal (aborts on a concurrent money writer).
            await lockDealVersion(client, deal.id, deal.version_no);
            const newVersion = await updatePayoutStatus(client, payout.id, payout.version_no, 'broadcast', null);
            if (newVersion === null) {
                throw new AppError('concurrent_update', 'The payout was modified concurrently; reload and retry.', 409);
            }
            await setPayoutPreflightStatus(client, payout.id, 'passed');
            try {
                await enqueuePayoutProcessing({
                    payoutId: payout.id,
                    expectedVersion: newVersion,
                    action: 'broadcast',
                    coin: payout.coin ?? '',
                    network: payout.network ?? '',
                    toAddress: payout.address ?? '',
                    amountSmallestUnit: (payout.amount_smallest_unit ?? 0n).toString(),
                });
            }
            catch (err) {
                console.warn('Failed to enqueue payout broadcast job:', err);
            }
            return {
                payoutId: payout.id,
                status: 'broadcast',
                broadcast: true,
                preflight: toView(preflight),
            };
        },
    });
    return result;
}
//# sourceMappingURL=payout.service.js.map