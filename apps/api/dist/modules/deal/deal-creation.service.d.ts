import type { CreateDealInput } from './deal.schemas.js';
export type FeePayer = 'buyer' | 'seller' | 'split';
export type NetworkMode = 'mainnet' | 'testnet';
export interface CreateDealArgs {
    readonly sellerId: string;
    readonly input: CreateDealInput;
}
export interface DuplicateDealArgs {
    readonly sellerId: string;
    readonly sourceDealId: string;
}
export interface CreatedDealResult {
    readonly dealId: string;
    readonly status: string;
    readonly createdAt: string;
    readonly duplicatedFrom?: string;
    /** True when screening routed the deal to middleman review (Requirement 9.2). */
    readonly requiresMiddlemanReview: boolean;
}
/** Create a brand-new deal owned by the seller. */
export declare function createDeal(args: CreateDealArgs): Promise<CreatedDealResult>;
/**
 * Duplicate a past deal the caller owns, cloning settings only. The new deal
 * has no buyer/middleman and resets status, attempt, and version to their
 * defaults; the latest terms snapshot is copied as version 1.
 */
export declare function duplicateDeal(args: DuplicateDealArgs): Promise<CreatedDealResult>;
//# sourceMappingURL=deal-creation.service.d.ts.map