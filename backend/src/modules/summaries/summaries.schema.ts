import { z } from 'zod';

export const getSummarySchema = z.object({
  publicationId: z.string().uuid(),
});

export const generateSummarySchema = z.object({
  publicationId: z.string().uuid(),
});

export const getSummaryJobStatusSchema = z.object({
  jobId: z.string().uuid(),
});

export const retryFailedSummaryJobsQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
  failedOlderThanMinutes: z.coerce.number().int().min(0).max(10080).default(0),
});

export type GetSummaryInput = z.infer<typeof getSummarySchema>;
export type GenerateSummaryInput = z.infer<typeof generateSummarySchema>;
export type GetSummaryJobStatusInput = z.infer<typeof getSummaryJobStatusSchema>;
export type RetryFailedSummaryJobsQueryInput = z.infer<
  typeof retryFailedSummaryJobsQuerySchema
>;
