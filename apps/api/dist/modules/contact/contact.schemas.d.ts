/**
 * Zod schema for the public contact form (task 8.3, Requirement 42.8).
 *
 * Re-usable on the client so the browser and the server validate identically.
 * Kept deliberately small: name, email, an optional subject, and a message.
 */
import { z } from 'zod';
export declare const contactMessageSchema: z.ZodObject<{
    name: z.ZodString;
    email: z.ZodString;
    subject: z.ZodOptional<z.ZodString>;
    message: z.ZodString;
}, "strip", z.ZodTypeAny, {
    email: string;
    message: string;
    name: string;
    subject?: string | undefined;
}, {
    email: string;
    message: string;
    name: string;
    subject?: string | undefined;
}>;
export type ContactMessageInput = z.infer<typeof contactMessageSchema>;
//# sourceMappingURL=contact.schemas.d.ts.map