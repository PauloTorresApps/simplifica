import { z } from 'zod';

export const listPublicationsSchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(10),
  date: z.string().optional(),
  search: z.string().optional(),
});

export const getPublicationSchema = z.object({
  id: z.string().uuid(),
});

export const getPublicationsByDateSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Data deve estar no formato YYYY-MM-DD'),
});

export type ListPublicationsInput = z.infer<typeof listPublicationsSchema>;
export type GetPublicationInput = z.infer<typeof getPublicationSchema>;
export type GetPublicationsByDateInput = z.infer<typeof getPublicationsByDateSchema>;
