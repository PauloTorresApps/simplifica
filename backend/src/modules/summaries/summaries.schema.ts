import { z } from 'zod';

export const getSummarySchema = z.object({
  publicationId: z.string().uuid(),
});

export const generateSummarySchema = z.object({
  publicationId: z.string().uuid(),
});

export type GetSummaryInput = z.infer<typeof getSummarySchema>;
export type GenerateSummaryInput = z.infer<typeof generateSummarySchema>;
