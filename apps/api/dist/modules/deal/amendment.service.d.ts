import * as amendRepo from './amendment.repository.js';
import type { DecisionInput, MiddlemanDecisionInput, RequestAmendmentInput, RequestCancellationInput } from './amendment.schemas.js';
export declare function requestAmendment(args: {
    dealId: string;
    userId: string;
    input: RequestAmendmentInput;
}): Promise<{
    amendmentId: string;
    status: "pending";
    changeType: "terms" | "coin" | "network" | "amount" | "product" | "fee_payer" | "inspection_window" | "other";
    requiresMiddleman: boolean;
    requesterRole: "buyer" | "seller";
}>;
export declare function decideAmendment(args: {
    dealId: string;
    amendmentId: string;
    userId: string;
    input: DecisionInput;
}): Promise<{
    amendmentId: string;
    status: string;
    routedToMiddleman: boolean;
    dealStatus?: never;
} | {
    amendmentId: string;
    status: string;
    dealStatus: string;
    routedToMiddleman?: never;
}>;
export declare function listAmendments(args: {
    dealId: string;
    userId: string;
}): Promise<{
    amendments: amendRepo.AmendmentRow[];
}>;
export declare function requestCancellation(args: {
    dealId: string;
    userId: string;
    input: RequestCancellationInput;
}): Promise<{
    cancellationId: string;
    status: "routed_to_dispute";
    routedToDispute: boolean;
    requesterRole: "buyer" | "seller";
} | {
    cancellationId: string;
    status: "pending";
    requesterRole: "buyer" | "seller";
    routedToDispute?: never;
}>;
export declare function decideCancellation(args: {
    dealId: string;
    cancellationId: string;
    userId: string;
    input: DecisionInput;
}): Promise<{
    cancellationId: string;
    status: string;
    routedToMiddleman: boolean;
    dealStatus?: never;
} | {
    cancellationId: string;
    status: string;
    dealStatus: string;
    routedToMiddleman?: never;
}>;
export declare function decideCancellationAsMiddleman(args: {
    dealId: string;
    cancellationId: string;
    userId: string;
    input: MiddlemanDecisionInput;
}): Promise<{
    cancellationId: string;
    status: string;
    dealStatus: string;
}>;
export declare function listCancellations(args: {
    dealId: string;
    userId: string;
}): Promise<{
    cancellations: amendRepo.CancellationRow[];
}>;
//# sourceMappingURL=amendment.service.d.ts.map