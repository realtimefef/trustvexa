export interface TxClient {
    query<R>(text: string, params?: ReadonlyArray<unknown>): Promise<{
        rows: R[];
        rowCount: number | null;
    }>;
}
export type ContactStatus = 'new' | 'read' | 'resolved';
export interface ContactMessageRow {
    id: string;
    name: string;
    email_enc: string;
    subject: string;
    body_enc: string;
    status: ContactStatus;
    created_at: string;
}
export declare function insertContactMessage(tx: TxClient, input: {
    name: string;
    emailEnc: string;
    subject: string;
    bodyEnc: string;
}): Promise<ContactMessageRow>;
export declare function setContactStatus(tx: TxClient, id: string, status: ContactStatus): Promise<void>;
//# sourceMappingURL=contact.repository.d.ts.map