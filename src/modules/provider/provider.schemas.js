import { z } from 'zod';

export const updateProfileSchema = z
  .object({
    fullName: z.string().trim().min(2).max(100).optional(),
    cityId: z.coerce.number().int().positive().optional(),
    subCityId: z.coerce.number().int().positive().optional(),
    categoryId: z.coerce.number().int().positive().optional(),
    woreda: z.string().trim().max(50).optional(),
    bio: z.string().trim().max(1000).optional(),
    experienceYears: z.coerce.number().int().min(0).max(60).optional(),
    avatarUrl: z.string().url().max(2048).optional(),
    workSamples: z.array(z.string().url().max(2048)).max(6).optional(),
  })
  .strict(); // Rejects unknown fields (no mass assignment!)

export const updateAvailabilitySchema = z
  .object({
    isAvailable: z.boolean(),
  })
  .strict();
