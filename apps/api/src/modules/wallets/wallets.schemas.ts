/**
 * Zod schemas for the wallets router (address book, validation, and
 * payout/refund wallet-change requests). Coin/network use the shared platform
 * allow-list so the API and client validate identically (slot 5 of the chain).
 */
import { SUPPORTED_COINS, SUPPORTED_NETWORKS } from '@trustvexa/shared';
import { z } from 'zod';

const coinSchema = z.enum(SUPPORTED_COINS);
const networkSchema = z.enum(SUPPORTED_NETWORKS);
const addressSchema = z.string().trim().min(1).max(128);

/** `POST /wallets/address-book` body. */
export const addAddressSchema = z.object({
  label: z.string().trim().min(1).max(120),
  coin: coinSchema,
  network: networkSchema,
  address: addressSchema,
});

/** `DELETE /wallets/address-book/:id` path param. */
export const addressIdParamSchema = z.object({ id: z.string().uuid() });

/** `POST /wallets/validate` body. */
export const validateAddressSchema = z.object({
  coin: coinSchema,
  network: networkSchema,
  address: addressSchema,
});

/** `POST /wallets/change-requests` body. */
export const changeRequestSchema = z.object({
  walletType: z.enum(['refund', 'payout']),
  coin: coinSchema,
  network: networkSchema,
  oldAddress: addressSchema.nullish(),
  newAddress: addressSchema,
  dealId: z.string().uuid().nullish(),
});

export type AddAddressInput = z.infer<typeof addAddressSchema>;
export type ValidateAddressInput = z.infer<typeof validateAddressSchema>;
export type ChangeRequestInput = z.infer<typeof changeRequestSchema>;

/** `POST /wallets/withdraw` body. */
export const withdrawSchema = z.object({
  coin: coinSchema,
  network: networkSchema,
  amount: z.string().refine((v) => {
    const parsed = Number.parseFloat(v);
    return Number.isFinite(parsed) && parsed > 0;
  }, 'Enter a valid amount'),
  address: addressSchema,
});

export type WithdrawInput = z.infer<typeof withdrawSchema>;
