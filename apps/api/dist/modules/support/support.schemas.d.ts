/**
 * Zod schemas for the support-tickets module (Build Spec §3 "Support / misc").
 *
 * Kept small and shareable with the client. `priority` mirrors the documented
 * support_tickets values (`normal` / `urgent` / `money_issue`); `category` is
 * a short free-text label since the migration does not constrain it.
 */
import { z } from 'zod';
export declare const createTicketSchema: z.ZodObject<{
    category: z.ZodString;
    priority: z.ZodDefault<z.ZodEnum<["normal", "urgent", "money_issue"]>>;
    subject: z.ZodString;
    body: z.ZodString;
}, "strip", z.ZodTypeAny, {
    priority: "normal" | "urgent" | "money_issue";
    body: string;
    subject: string;
    category: string;
}, {
    body: string;
    subject: string;
    category: string;
    priority?: "normal" | "urgent" | "money_issue" | undefined;
}>;
export type CreateTicketInput = z.infer<typeof createTicketSchema>;
export declare const ticketIdParamSchema: z.ZodObject<{
    id: z.ZodString;
}, "strip", z.ZodTypeAny, {
    id: string;
}, {
    id: string;
}>;
//# sourceMappingURL=support.schemas.d.ts.map