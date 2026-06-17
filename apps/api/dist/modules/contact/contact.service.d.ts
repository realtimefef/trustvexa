import type { ContactMessageInput } from './contact.schemas.js';
export interface ContactSubmissionResult {
    id: string;
    status: string;
    createdAt: string;
}
export declare function submitContactMessage(input: ContactMessageInput): Promise<ContactSubmissionResult>;
//# sourceMappingURL=contact.service.d.ts.map