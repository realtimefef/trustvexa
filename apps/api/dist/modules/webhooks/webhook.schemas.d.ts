import { z } from 'zod';
export declare const createWebhookSchema: z.ZodObject<{
    url: z.ZodEffects<z.ZodString, string, string>;
    events: z.ZodArray<z.ZodEnum<["deal.funded", "deal.completed", "deal.disputed", "payout.broadcast"]>, "many">;
}, "strip", z.ZodTypeAny, {
    url: string;
    events: ("deal.funded" | "deal.completed" | "deal.disputed" | "payout.broadcast")[];
}, {
    url: string;
    events: ("deal.funded" | "deal.completed" | "deal.disputed" | "payout.broadcast")[];
}>;
export type CreateWebhookInput = z.infer<typeof createWebhookSchema>;
//# sourceMappingURL=webhook.schemas.d.ts.map