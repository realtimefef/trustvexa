export interface ContactMessageRow {
    id: string;
    status: string | null;
    created_at: Date | string;
}
export interface InsertContactMessageParams {
    name: string;
    emailEnc: string;
    subject: string | null;
    bodyEnc: string;
    status: string;
}
export declare function insertContactMessage(params: InsertContactMessageParams): Promise<ContactMessageRow>;
//# sourceMappingURL=contact.repository.d.ts.map