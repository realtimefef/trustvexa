export interface IssuedCode {
    code: string;
    expiresAt: string;
}
export declare function requestVerificationCode(args: {
    dealId: string;
    requesterId: string;
}): Promise<IssuedCode>;
export interface VerifyResult {
    dealId: string;
    status: string;
}
export declare function submitVerificationCode(args: {
    dealId: string;
    submitterId: string;
    code: string;
}): Promise<VerifyResult>;
//# sourceMappingURL=verification.service.d.ts.map