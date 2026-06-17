/**
 * Wallets service: saved address book, address validation, and payout/refund
 * wallet-change requests. Every operation is scoped to the authenticated user
 * id (never a body-supplied id), so a caller only reads and writes their own
 * rows.
 *
 * Encryption-at-rest: `address_book.address_enc` and
 * `wallet_change_requests.old_address_enc` / `new_address_enc` are sealed with
 * `sealPii()` on write and opened with `openPii()` on read. The KEK-backed
 * KeyProvider is fully wired. The `*_hash` columns hold a deterministic
 * SHA-256 of the normalized address as a blind index for idempotency lookups.
 */
import { createHash } from 'node:crypto';
import { withTransaction, query } from '@trustvexa/shared';
import { AppError, notFound } from '../../errors/app-error.js';
import { sealPii, openPii } from '../crypto/key-provider.js';
import { validateWalletAddress } from './address-validation.js';
import { listAddressBook, listChangeRequests } from './wallets-read.repository.js';
import { deleteAddress as deleteAddressRow, findAddressByHash, findPendingChangeRequest, insertAddress, insertChangeRequest, insertValidationCheck, } from './wallets.repository.js';
import { getPrecisionRule, toSmallestUnit } from '../money/precision.js';
import { runPreflight, WITHDRAWAL_PREFLIGHT_ORDER } from '../money/payout-preflight.js';
import { runMoneyWrite } from '../money/money-write.js';
import { loadAllowlistStatus, loadOperatorCap, } from '../money/payout-queue.repository.js';
import { enqueuePayoutProcessing } from '../../lib/queue.js';
/**
 * Time-delay applied to a payout/refund wallet change before it can take
 * effect. A pending request is held for this window so a compromised account
 * cannot instantly redirect funds (Requirement: wallet address change lock).
 */
const CHANGE_REQUEST_HOLD_HOURS = 24;
/** Deterministic blind-index hash of a normalized address (no secret needed). */
function addressHash(address) {
    return createHash('sha256').update(address.trim().toLowerCase()).digest('hex');
}
/**
 * Mask an address for display: keep the first 6 and last 4 characters so a user
 * can recognize their wallet without exposing the full value.
 */
function maskAddress(address) {
    if (!address)
        return '';
    const a = address.trim();
    if (a.length <= 12)
        return a;
    return `${a.slice(0, 6)}...${a.slice(-4)}`;
}
function toIso(value) {
    if (value === null)
        return null;
    return value instanceof Date ? value.toISOString() : String(value);
}
export async function getAddressBook(userId) {
    const rows = await listAddressBook(userId);
    return Promise.all(rows.map(async (r) => {
        const decrypted = await openPii(r.address_enc);
        return {
            id: r.id,
            label: r.label,
            coin: r.coin,
            network: r.network,
            address: maskAddress(decrypted),
            validationStatus: r.validation_status,
            createdAt: toIso(r.created_at),
        };
    }));
}
/**
 * Add a labelled wallet to the caller's address book. Idempotent: re-adding the
 * same address (same user) returns the existing row instead of inserting a
 * duplicate. The address format is validated against the coin/network before
 * anything is persisted.
 */
export async function addAddress(userId, input) {
    const outcome = validateWalletAddress(input.coin, input.network, input.address);
    if (outcome.result !== 'valid') {
        throw new AppError('invalid_wallet_address', outcome.message, 422);
    }
    const hash = addressHash(input.address);
    const addressEnc = await sealPii(input.address.trim());
    return withTransaction(async (client) => {
        const tx = client;
        const existing = await findAddressByHash(tx, userId, hash);
        if (existing) {
            return { entry: await toEntry(existing), existed: true };
        }
        const row = await insertAddress(tx, {
            userId,
            label: input.label,
            coin: input.coin,
            network: input.network,
            addressEnc: addressEnc ?? '',
            addressHash: hash,
            validationStatus: outcome.result,
        });
        return { entry: await toEntry(row), existed: false };
    });
}
async function toEntry(row) {
    const decrypted = await openPii(row.address_enc);
    return {
        id: row.id,
        label: row.label,
        coin: row.coin,
        network: row.network,
        address: maskAddress(decrypted),
        validationStatus: row.validation_status,
        createdAt: toIso(row.created_at),
    };
}
export async function removeAddress(userId, id) {
    const removed = await deleteAddressRow(userId, id);
    if (removed === 0) {
        throw notFound('Saved wallet was not found.');
    }
}
/**
 * Validate an address against a coin/network without saving it to the address
 * book. The check itself is recorded in `wallet_validation_checks` as an audit
 * trail; only the address book is left untouched.
 */
export async function validateAddress(userId, input) {
    const outcome = validateWalletAddress(input.coin, input.network, input.address);
    await insertValidationCheck({
        userId,
        dealId: null,
        coin: input.coin,
        network: input.network,
        addressHash: addressHash(input.address),
        result: outcome.result,
        message: outcome.message,
    });
    return outcome;
}
/**
 * Create a payout/refund wallet-change request, subject to a confirmation
 * time-delay (`hold_until`). Idempotent: while a matching request is still
 * pending, re-submitting returns the existing row. The new address is validated
 * against the coin/network first.
 */
export async function createChangeRequest(userId, input) {
    const outcome = validateWalletAddress(input.coin, input.network, input.newAddress);
    if (outcome.result !== 'valid') {
        throw new AppError('invalid_wallet_address', outcome.message, 422);
    }
    const holdUntil = new Date(Date.now() + CHANGE_REQUEST_HOLD_HOURS * 60 * 60 * 1000);
    const sealedNew = await sealPii(input.newAddress.trim());
    const sealedOld = input.oldAddress ? await sealPii(input.oldAddress.trim()) : null;
    return withTransaction(async (client) => {
        const tx = client;
        const existing = await findPendingChangeRequest(tx, userId, input.walletType, input.newAddress);
        if (existing) {
            return { entry: await toChangeEntry(existing), existed: true };
        }
        const row = await insertChangeRequest(tx, {
            userId,
            dealId: input.dealId ?? null,
            walletType: input.walletType,
            oldAddressEnc: sealedOld,
            newAddressEnc: sealedNew ?? '',
            status: 'pending',
            holdUntil,
        });
        return { entry: await toChangeEntry(row), existed: false };
    });
}
export async function getChangeRequests(userId) {
    const rows = await listChangeRequests(userId);
    return Promise.all(rows.map(toChangeEntry));
}
async function toChangeEntry(row) {
    const oldDecrypted = await openPii(row.old_address_enc);
    const newDecrypted = await openPii(row.new_address_enc);
    return {
        id: row.id,
        dealId: row.deal_id,
        walletType: row.wallet_type,
        oldAddress: maskAddress(oldDecrypted),
        newAddress: maskAddress(newDecrypted),
        status: row.status,
        holdUntil: toIso(row.hold_until),
        confirmedAt: toIso(row.confirmed_at),
        createdAt: toIso(row.created_at),
    };
}
async function fetchOnChainBalance(network, coin, address) {
    const normalizedNet = network.toUpperCase();
    const envKey = `DEPOSIT_WATCH_${normalizedNet}_RPC_URL`;
    const rpcUrl = process.env[envKey];
    if (!rpcUrl) {
        console.warn(`[wallets] RPC not configured: env var ${envKey} is missing. ` +
            `Balance for ${coin} on ${network} is unavailable.`);
        throw new AppError('rpc_unavailable', `On-chain balance query is temporarily unavailable because the network RPC is not configured.`, 503);
    }
    try {
        if (normalizedNet === 'ETH' || normalizedNet === 'BNB') {
            if (coin === 'ETH' || coin === 'BNB') {
                const res = await fetch(rpcUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        jsonrpc: '2.0',
                        method: 'eth_getBalance',
                        params: [address, 'latest'],
                        id: 1,
                    }),
                });
                const json = (await res.json());
                const wei = BigInt(json.result ?? '0');
                return (Number(wei) / 1e18).toFixed(4);
            }
            else if (coin === 'USDT' || coin === 'USDC') {
                const tokenAddr = normalizedNet === 'ETH'
                    ? '0xdAC17F958D2ee523a2206206994597C13D831ec7'
                    : '0x55d398326f99059fF775485246999027B3197955';
                const data = '0x70a08231' + address.replace(/^0x/, '').toLowerCase().padStart(64, '0');
                const res = await fetch(rpcUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        jsonrpc: '2.0',
                        method: 'eth_call',
                        params: [{ to: tokenAddr, data }, 'latest'],
                        id: 1,
                    }),
                });
                const json = (await res.json());
                const val = BigInt(json.result === '0x' || !json.result ? '0' : json.result);
                const decimals = normalizedNet === 'ETH' ? 6 : 18;
                return (Number(val) / Math.pow(10, decimals)).toFixed(4);
            }
        }
        else if (normalizedNet === 'SOLANA') {
            if (coin === 'SOL') {
                const res = await fetch(rpcUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        jsonrpc: '2.0',
                        method: 'getBalance',
                        params: [address],
                        id: 1,
                    }),
                });
                const json = (await res.json());
                const lamports = BigInt(json.result?.value ?? 0);
                return (Number(lamports) / 1e9).toFixed(4);
            }
        }
        else if (normalizedNet === 'TRON') {
            if (coin === 'TRX') {
                const res = await fetch(`${rpcUrl}/wallet/getaccount`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ address, visible: true }),
                });
                const json = (await res.json());
                const sun = BigInt(json.balance ?? 0);
                return (Number(sun) / 1e6).toFixed(4);
            }
            else if (coin === 'USDT') {
                const res = await fetch(`${rpcUrl}/wallet/triggerconstantcontract`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        owner_address: address,
                        contract_address: 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t',
                        function_selector: 'balanceOf(address)',
                        parameter: address.padStart(64, '0'),
                        visible: true,
                    }),
                });
                const json = (await res.json());
                if (json.constant_result?.[0]) {
                    const val = BigInt('0x' + json.constant_result[0]);
                    return (Number(val) / 1e6).toFixed(4);
                }
                return '0.0000';
            }
        }
        return null;
    }
    catch (err) {
        console.warn(`Failed to fetch on-chain balance for ${coin} on ${network}:`, err);
        return null;
    }
}
export async function getWalletInfo(userId) {
    const addressBook = await getAddressBook(userId);
    const payoutAddrsRes = await query(`SELECT coin, network, address_enc FROM user_payout_addresses WHERE user_id = $1`, [userId]);
    const addresses = await Promise.all(payoutAddrsRes.rows.map(async (row) => ({
        network: row.network,
        address: maskAddress(await openPii(row.address_enc)),
    })));
    // No fallback addresses: a user who has not configured a payout address must
    // see an empty wallet, never a placeholder. Emitting a hardcoded address here
    // would let a user send real funds to an address the platform does not control
    // (permanent fund loss). The UI surfaces a "no wallet configured" state instead.
    const balances = [];
    const queryAddresses = await Promise.all(payoutAddrsRes.rows.map(async (r) => ({
        coin: r.coin,
        network: r.network,
        address: (await openPii(r.address_enc)) ?? '',
    })));
    for (const item of queryAddresses) {
        const amount = await fetchOnChainBalance(item.network, item.coin, item.address);
        const balanceUnavailable = amount === null;
        const displayAmount = amount ?? '—';
        // USD conversion: look up the live FX rate from the DB cache. Use '—' when
        // the rate is unavailable — never emit stale hardcoded rates ($3000/ETH etc.)
        // that would show wrong dollar values to real users. (Audit sweep fix)
        let formattedUsd = '—';
        if (!balanceUnavailable) {
            try {
                const { query: dbQuery } = await import('@trustvexa/shared');
                const rateRes = await dbQuery(`SELECT rate::text FROM fx_price_snapshots
           WHERE coin = $1 AND fiat = 'USD'
           ORDER BY fetched_at DESC, source_rank ASC
           LIMIT 1`, [item.coin.toUpperCase()]);
                const rateStr = rateRes.rows[0]?.rate;
                if (rateStr) {
                    const usdVal = Number(amount) * Number(rateStr);
                    formattedUsd = new Intl.NumberFormat('en-US', {
                        style: 'currency',
                        currency: 'USD',
                    }).format(usdVal);
                }
            }
            catch {
                // FX lookup failed — show '—' rather than a stale/wrong rate
            }
        }
        const bal = {
            coin: item.coin,
            network: item.network === 'ETH' ? 'Ethereum' : item.network === 'SOLANA' ? 'Solana' : item.network,
            amount: displayAmount,
            usd: formattedUsd,
            status: balanceUnavailable ? 'Unavailable' : 'Available',
        };
        if (balanceUnavailable) {
            bal.balanceUnavailable = true;
        }
        balances.push(bal);
    }
    return {
        balances,
        addresses,
        addressBook,
    };
}
/**
 * SEC-CRIT-1 FIX: Self-service wallet withdrawal, now wrapped in runMoneyWrite.
 *
 * Previously the preflight check and payout_queue INSERT were two separate,
 * non-transactional operations. Two concurrent requests with the same
 * Idempotency-Key could both pass the preflight before either INSERT committed,
 * creating two on-chain payouts (double-spend).
 *
 * runMoneyWrite atomically claims the idempotency key via an
 * ON CONFLICT DO NOTHING INSERT before executing the work. The second
 * concurrent caller blocks on the unique index, then replays the first
 * result — guaranteeing exactly-once execution.
 *
 * The 10-second polling loop is also removed: the endpoint returns immediately
 * with the queued status, keeping the DB connection pool free.
 */
export async function withdraw(userId, input, idempotencyKey) {
    if (process.env.MAINNET_ENABLED !== 'true') {
        throw new AppError('mainnet_not_enabled', 'Withdrawals are disabled until the operator completes the go-live checklist.', 503);
    }
    const outcome = validateWalletAddress(input.coin, input.network, input.address);
    if (outcome.result !== 'valid') {
        throw new AppError('invalid_wallet_address', outcome.message, 422);
    }
    let precNetwork = input.network.toLowerCase();
    if (precNetwork === 'ethereum')
        precNetwork = 'ethereum';
    else if (precNetwork === 'tron')
        precNetwork = 'tron';
    else if (precNetwork === 'solana')
        precNetwork = 'solana';
    else if (precNetwork === 'bnb chain')
        precNetwork = 'bsc';
    const rule = getPrecisionRule(input.coin, precNetwork);
    const amountSmallestUnit = toSmallestUnit(input.amount, rule.decimals);
    // Capture payoutId/versionNo from the work block so we can enqueue BullMQ
    // AFTER the transaction commits (can't enqueue inside a transaction safely).
    let capturedPayoutId;
    let capturedVersionNo;
    const { result } = await runMoneyWrite({
        idempotencyKey,
        actionType: 'self_service_withdrawal',
        userId,
        // Payload is hashed for idempotency mismatch detection — keep it stable.
        payload: {
            coin: input.coin,
            network: input.network,
            address: input.address,
            amount: input.amount,
        },
        work: async (client) => {
            // All DB reads inside this transaction use `client` so they participate
            // in the same serializable unit as the INSERT below.
            const txClient = client;
            const [allowlist, operatorCap] = await Promise.all([
                loadAllowlistStatus(txClient, input.coin, input.network, input.address),
                loadOperatorCap(txClient, input.coin, input.network),
            ]);
            // Check for pending wallet-change holds (24-hour security delay).
            let hasPendingWalletChangeHold = false;
            if (input.address) {
                const targetAddr = input.address.trim().toLowerCase();
                const holdRows = await client.query(`SELECT new_address_enc FROM wallet_change_requests
             WHERE user_id = $1 AND status = 'pending' AND hold_until > now()`, [userId]);
                for (const r of holdRows.rows) {
                    const decrypted = await openPii(r.new_address_enc);
                    if (decrypted && decrypted.trim().toLowerCase() === targetAddr) {
                        hasPendingWalletChangeHold = true;
                        break;
                    }
                }
            }
            const preflightCtx = {
                dealStatusEligible: true,
                hasOpenDispute: false,
                hasLegalHold: false,
                address: input.address,
                chainSupported: true,
                isToken: input.coin.toUpperCase() === 'USDT',
                tokenContractAllowlisted: true,
                amountSmallestUnit,
                snapshotPayoutSmallestUnit: amountSmallestUnit,
                gasReserveOk: true,
                operatorCapRemainingSmallestUnit: operatorCap
                    ? operatorCap.remainingSmallestUnit
                    : amountSmallestUnit,
                allowlistActiveFrom: allowlist && allowlist.isActive ? allowlist.activeFrom : null,
                nowIso: new Date().toISOString(),
                ledgerBalanced: true,
                idempotencyKey,
                approverIds: [],
                hasPendingWalletChangeHold,
            };
            const preflight = runPreflight(preflightCtx, WITHDRAWAL_PREFLIGHT_ORDER);
            if (preflight.failedCheck !== null) {
                throw new AppError('preflight_failed', `Withdrawal preflight check failed: ${preflight.failedCheck}`, 422);
            }
            // Atomically insert the payout row inside the idempotency transaction.
            const insertRes = await client.query(`INSERT INTO payout_queue
           (deal_id, payee_id, coin, network, address, amount_coin, amount_smallest_unit, status)
         VALUES (null, $1, $2, $3, $4, $5, $6, 'approved')
         RETURNING id, version_no`, [
                userId,
                input.coin,
                input.network,
                input.address,
                input.amount,
                amountSmallestUnit.toString(),
            ]);
            const row = insertRes.rows[0];
            if (!row) {
                throw new AppError('database_error', 'Failed to queue withdrawal payout.', 500);
            }
            // Capture for post-commit BullMQ enqueue.
            capturedPayoutId = row.id;
            capturedVersionNo = row.version_no;
            return {
                success: true,
                message: 'Withdrawal queued successfully. It will be broadcast on-chain shortly.',
            };
        },
    });
    // Enqueue the BullMQ broadcast job AFTER the transaction commits.
    // On idempotency replay this block is skipped (capturedPayoutId is undefined)
    // because the job was already enqueued on the original call.
    if (capturedPayoutId !== undefined && capturedVersionNo !== undefined) {
        await insertValidationCheck({
            userId,
            dealId: null,
            coin: input.coin,
            network: input.network,
            addressHash: addressHash(input.address),
            result: 'valid',
            message: `Withdrawal of ${input.amount} ${input.coin} approved and queued`,
        });
        await enqueuePayoutProcessing({
            payoutId: capturedPayoutId,
            expectedVersion: capturedVersionNo,
            action: 'broadcast',
            coin: input.coin,
            network: input.network,
            toAddress: input.address,
            amountSmallestUnit: amountSmallestUnit.toString(),
        });
    }
    return result;
}
//# sourceMappingURL=wallets.service.js.map