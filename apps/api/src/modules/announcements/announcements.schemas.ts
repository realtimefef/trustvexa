/**
 * Zod schema for the announcements module (Build Spec §3 "Support / misc").
 */
import { z } from 'zod';

export const announcementIdParamSchema = z.object({
  id: z.string().uuid(),
});
