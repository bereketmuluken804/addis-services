import { z } from 'zod';

export const providerDirectoryQuerySchema = z.object({
  categoryId: z.coerce.number().int().positive().optional(),
  cityId: z.coerce.number().int().positive().optional(),
  subCityId: z.coerce.number().int().positive().optional(),
  availableOnly: z
    .preprocess((val) => val === 'true' || val === true, z.boolean())
    .default(false),
  search: z.string().trim().optional(),
  sortBy: z.enum(['rating', 'reviews', 'calls']).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const paginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const providerIdParamSchema = z.object({
  id: z.coerce.number().int().positive('Provider ID must be a positive integer'),
});

