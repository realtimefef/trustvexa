/**
 * Party details service — seller and buyer information for a deal.
 *
 * Each party submits details relevant to their role:
 *   - The seller describes the product/service and how they will deliver it.
 *   - The buyer describes where/how they want to receive the deliverable.
 *
 * All PII fields are envelope-encrypted at rest using sealPii() and decrypted
 * on read using openPii(). The middleman can view both sides; each party can
 * only view their own record.
 *
 * Tables: deal_seller_details, deal_buyer_details (created in
 * 1700002700000_deal_party_details migration).
 */
import { query } from '@trustvexa/shared';

import { AppError } from '../../errors/app-error.js';
import { sealPii, openPii } from '../crypto/key-provider.js';
import { acquireClient, type TxClient } from './deal.repository.js';

// ── Input types ──────────────────────────────────────────────────────────────

export interface SubmitSellerDetailsInput {
  productName?: string | null;
  productDescription?: string | null;
  requirements?: string | null;
  deliveryMethod?: string | null;
  deliveryInstructions?: string | null;
  estimatedDeliveryTime?: string | null;
  additionalNotes?: string | null;
}

export interface SubmitBuyerDetailsInput {
  receivingPlatform?: string | null;
  receivingAddress?: string | null;
  contactEmail?: string | null;
  backupContact?: string | null;
  specialInstructions?: string | null;
  suggestions?: string | null;
}

// ── Output types ─────────────────────────────────────────────────────────────

export interface SellerDetailsView {
  id: string;
  dealId: string;
  productName: string | null;
  productDescription: string | null;
  requirements: string | null;
  deliveryMethod: string | null;
  deliveryInstructions: string | null;
  estimatedDeliveryTime: string | null;
  additionalNotes: string | null;
  submittedAt: string | null;
  verifiedByMiddleman: boolean;
  verifiedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface BuyerDetailsView {
  id: string;
  dealId: string;
  receivingPlatform: string | null;
  receivingAddress: string | null;
  contactEmail: string | null;
  backupContact: string | null;
  specialInstructions: string | null;
  suggestions: string | null;
  confirmedByBuyer: boolean;
  confirmedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PartyDetailsResult {
  sellerDetails: SellerDetailsView | null;
  buyerDetails: BuyerDetailsView | null;
}

// ── Internal DB row types ────────────────────────────────────────────────────

interface SellerDetailsRow {
  id: string;
  deal_id: string;
  product_name: string | null;
  product_description_enc: string | null;
  requirements_enc: string | null;
  delivery_method: string | null;
  delivery_instructions_enc: string | null;
  estimated_delivery_time: string | null;
  additional_notes_enc: string | null;
  submitted_at: string | null;
  verified_by_middleman: boolean;
  verified_at: string | null;
  created_at: string;
  updated_at: string;
}

interface BuyerDetailsRow {
  id: string;
  deal_id: string;
  receiving_platform: string | null;
  receiving_address_enc: string | null;
  contact_email_enc: string | null;
  backup_contact_enc: string | null;
  special_instructions_enc: string | null;
  suggestions_enc: string | null;
  confirmed_by_buyer: boolean;
  confirmed_at: string | null;
  created_at: string;
  updated_at: string;
}

interface DealParticipantsRow {
  buyer_id: string | null;
  seller_id: string | null;
  middleman_id: string | null;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

async function loadDealParticipants(dealId: string): Promise<DealParticipantsRow | null> {
  const res = await query<DealParticipantsRow>(
    `SELECT buyer_id, seller_id, middleman_id FROM deals WHERE id = $1`,
    [dealId],
  );
  return res.rows[0] ?? null;
}

async function decryptSellerRow(row: SellerDetailsRow): Promise<SellerDetailsView> {
  const [
    productDescription,
    requirements,
    deliveryInstructions,
    additionalNotes,
  ] = await Promise.all([
    openPii(row.product_description_enc),
    openPii(row.requirements_enc),
    openPii(row.delivery_instructions_enc),
    openPii(row.additional_notes_enc),
  ]);

  return {
    id: row.id,
    dealId: row.deal_id,
    productName: row.product_name,
    productDescription,
    requirements,
    deliveryMethod: row.delivery_method,
    deliveryInstructions,
    estimatedDeliveryTime: row.estimated_delivery_time,
    additionalNotes,
    submittedAt: row.submitted_at,
    verifiedByMiddleman: row.verified_by_middleman,
    verifiedAt: row.verified_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function decryptBuyerRow(row: BuyerDetailsRow): Promise<BuyerDetailsView> {
  const [
    receivingAddress,
    contactEmail,
    backupContact,
    specialInstructions,
    suggestions,
  ] = await Promise.all([
    openPii(row.receiving_address_enc),
    openPii(row.contact_email_enc),
    openPii(row.backup_contact_enc),
    openPii(row.special_instructions_enc),
    openPii(row.suggestions_enc),
  ]);

  return {
    id: row.id,
    dealId: row.deal_id,
    receivingPlatform: row.receiving_platform,
    receivingAddress,
    contactEmail,
    backupContact,
    specialInstructions,
    suggestions,
    confirmedByBuyer: row.confirmed_by_buyer,
    confirmedAt: row.confirmed_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// ── Service functions ────────────────────────────────────────────────────────

/**
 * Submit (upsert) the seller's product and delivery details for a deal.
 * Only the deal's seller may call this. Encrypted PII fields are sealed before
 * storage. Re-submitting updates the existing record.
 */
export async function submitSellerDetails(
  userId: string,
  dealId: string,
  input: SubmitSellerDetailsInput,
): Promise<SellerDetailsView> {
  const deal = await loadDealParticipants(dealId);
  if (!deal) {
    throw new AppError('deal_not_found', 'Deal was not found.', 404);
  }
  if (deal.seller_id !== userId) {
    throw new AppError(
      'forbidden',
      'Only the deal\'s seller can submit seller details.',
      403,
    );
  }

  // Encrypt all PII fields in parallel.
  const [
    productDescriptionEnc,
    requirementsEnc,
    deliveryInstructionsEnc,
    additionalNotesEnc,
  ] = await Promise.all([
    sealPii(input.productDescription ?? null),
    sealPii(input.requirements ?? null),
    sealPii(input.deliveryInstructions ?? null),
    sealPii(input.additionalNotes ?? null),
  ]);

  const client: TxClient = await acquireClient();
  try {
    await client.query('BEGIN');

    // Upsert: insert on first submit, update on subsequent submits.
    const res = await client.query<SellerDetailsRow>(`
      INSERT INTO deal_seller_details (
        deal_id,
        product_name,
        product_description_enc,
        requirements_enc,
        delivery_method,
        delivery_instructions_enc,
        estimated_delivery_time,
        additional_notes_enc,
        submitted_at,
        updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, now(), now())
      ON CONFLICT (deal_id) DO UPDATE SET
        product_name              = EXCLUDED.product_name,
        product_description_enc   = EXCLUDED.product_description_enc,
        requirements_enc          = EXCLUDED.requirements_enc,
        delivery_method           = EXCLUDED.delivery_method,
        delivery_instructions_enc = EXCLUDED.delivery_instructions_enc,
        estimated_delivery_time   = EXCLUDED.estimated_delivery_time,
        additional_notes_enc      = EXCLUDED.additional_notes_enc,
        submitted_at              = now(),
        updated_at                = now()
      RETURNING *
    `, [
      dealId,
      input.productName ?? null,
      productDescriptionEnc,
      requirementsEnc,
      input.deliveryMethod ?? null,
      deliveryInstructionsEnc,
      input.estimatedDeliveryTime ?? null,
      additionalNotesEnc,
    ]);

    await client.query('COMMIT');

    const row = res.rows[0];
    if (!row) {
      throw new AppError('internal_error', 'Failed to upsert seller details.', 500);
    }
    return decryptSellerRow(row);
  } catch (err) {
    try { await client.query('ROLLBACK'); } catch { /* ignore */ }
    throw err;
  } finally {
    client.release();
  }
}

/**
 * Submit (upsert) the buyer's receiving information for a deal.
 * Only the deal's buyer may call this. Encrypted PII fields are sealed before
 * storage. Re-submitting updates the existing record.
 */
export async function submitBuyerDetails(
  userId: string,
  dealId: string,
  input: SubmitBuyerDetailsInput,
): Promise<BuyerDetailsView> {
  const deal = await loadDealParticipants(dealId);
  if (!deal) {
    throw new AppError('deal_not_found', 'Deal was not found.', 404);
  }
  if (deal.buyer_id !== userId) {
    throw new AppError(
      'forbidden',
      'Only the deal\'s buyer can submit buyer details.',
      403,
    );
  }

  // Encrypt all PII fields in parallel.
  const [
    receivingAddressEnc,
    contactEmailEnc,
    backupContactEnc,
    specialInstructionsEnc,
    suggestionsEnc,
  ] = await Promise.all([
    sealPii(input.receivingAddress ?? null),
    sealPii(input.contactEmail ?? null),
    sealPii(input.backupContact ?? null),
    sealPii(input.specialInstructions ?? null),
    sealPii(input.suggestions ?? null),
  ]);

  const client: TxClient = await acquireClient();
  try {
    await client.query('BEGIN');

    const res = await client.query<BuyerDetailsRow>(`
      INSERT INTO deal_buyer_details (
        deal_id,
        receiving_platform,
        receiving_address_enc,
        contact_email_enc,
        backup_contact_enc,
        special_instructions_enc,
        suggestions_enc,
        updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, now())
      ON CONFLICT (deal_id) DO UPDATE SET
        receiving_platform       = EXCLUDED.receiving_platform,
        receiving_address_enc    = EXCLUDED.receiving_address_enc,
        contact_email_enc        = EXCLUDED.contact_email_enc,
        backup_contact_enc       = EXCLUDED.backup_contact_enc,
        special_instructions_enc = EXCLUDED.special_instructions_enc,
        suggestions_enc          = EXCLUDED.suggestions_enc,
        updated_at               = now()
      RETURNING *
    `, [
      dealId,
      input.receivingPlatform ?? null,
      receivingAddressEnc,
      contactEmailEnc,
      backupContactEnc,
      specialInstructionsEnc,
      suggestionsEnc,
    ]);

    await client.query('COMMIT');

    const row = res.rows[0];
    if (!row) {
      throw new AppError('internal_error', 'Failed to upsert buyer details.', 500);
    }
    return decryptBuyerRow(row);
  } catch (err) {
    try { await client.query('ROLLBACK'); } catch { /* ignore */ }
    throw err;
  } finally {
    client.release();
  }
}

/**
 * Retrieve party details for a deal with role-based visibility:
 *   - middleman: sees both seller details (decrypted) AND buyer details (decrypted)
 *   - seller:    sees only their own seller details (decrypted), NOT buyer details
 *   - buyer:     sees only their own buyer details (decrypted), NOT seller details
 *
 * Returns null for records that do not exist yet or that the caller is not
 * permitted to read.
 */
export async function getPartyDetails(
  userId: string,
  dealId: string,
): Promise<PartyDetailsResult> {
  const deal = await loadDealParticipants(dealId);
  if (!deal) {
    throw new AppError('deal_not_found', 'Deal was not found.', 404);
  }

  const isSeller = deal.seller_id === userId;
  const isBuyer = deal.buyer_id === userId;
  const isMiddleman = deal.middleman_id === userId;

  if (!isSeller && !isBuyer && !isMiddleman) {
    throw new AppError(
      'forbidden',
      'You are not a party to this deal.',
      403,
    );
  }

  // Determine which sides the caller is allowed to read.
  const canReadSeller = isSeller || isMiddleman;
  const canReadBuyer = isBuyer || isMiddleman;

  const [sellerRes, buyerRes] = await Promise.all([
    canReadSeller
      ? query<SellerDetailsRow>(
          `SELECT * FROM deal_seller_details WHERE deal_id = $1 LIMIT 1`,
          [dealId],
        )
      : Promise.resolve({ rows: [] as SellerDetailsRow[] }),
    canReadBuyer
      ? query<BuyerDetailsRow>(
          `SELECT * FROM deal_buyer_details WHERE deal_id = $1 LIMIT 1`,
          [dealId],
        )
      : Promise.resolve({ rows: [] as BuyerDetailsRow[] }),
  ]);

  const sellerRow = sellerRes.rows[0] ?? null;
  const buyerRow = buyerRes.rows[0] ?? null;

  const [sellerDetails, buyerDetails] = await Promise.all([
    sellerRow ? decryptSellerRow(sellerRow) : Promise.resolve(null),
    buyerRow ? decryptBuyerRow(buyerRow) : Promise.resolve(null),
  ]);

  return { sellerDetails, buyerDetails };
}

/**
 * Mark one side of the party details as verified by the middleman.
 * Only the deal's assigned middleman may call this.
 */
export async function verifyPartyDetails(
  middlemanId: string,
  dealId: string,
  role: 'seller' | 'buyer',
): Promise<{ dealId: string; role: 'seller' | 'buyer'; verifiedAt: string }> {
  const deal = await loadDealParticipants(dealId);
  if (!deal) {
    throw new AppError('deal_not_found', 'Deal was not found.', 404);
  }
  if (deal.middleman_id !== middlemanId) {
    throw new AppError(
      'forbidden',
      'Only the assigned middleman can verify party details.',
      403,
    );
  }

  const now = new Date().toISOString();

  if (role === 'seller') {
    const res = await query<{ verified_at: string }>(
      `UPDATE deal_seller_details
          SET verified_by_middleman = true,
              verified_at           = now(),
              updated_at            = now()
        WHERE deal_id = $1
        RETURNING verified_at`,
      [dealId],
    );
    if (res.rows.length === 0) {
      throw new AppError(
        'not_found',
        'Seller details have not been submitted for this deal yet.',
        404,
      );
    }
    return { dealId, role, verifiedAt: res.rows[0]!.verified_at ?? now };
  } else {
    const res = await query<{ confirmed_at: string }>(
      `UPDATE deal_buyer_details
          SET confirmed_by_buyer = true,
              confirmed_at       = now(),
              updated_at         = now()
        WHERE deal_id = $1
        RETURNING confirmed_at`,
      [dealId],
    );
    if (res.rows.length === 0) {
      throw new AppError(
        'not_found',
        'Buyer details have not been submitted for this deal yet.',
        404,
      );
    }
    return { dealId, role, verifiedAt: res.rows[0]!.confirmed_at ?? now };
  }
}
