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

export const changePasswordSchema = z
  .object({
    currentPassword: z
      .string()
      .min(1, 'Current password is required')
      .refine((val) => Buffer.byteLength(val, 'utf8') <= 72, {
        message: 'Current password must not exceed 72 bytes',
      }),
    newPassword: z
      .string()
      .min(8, 'New password must be at least 8 characters')
      .refine((val) => Buffer.byteLength(val, 'utf8') <= 72, {
        message: 'New password must not exceed 72 bytes',
      }),
  })
  .strict();

export const createPhoneChangeRequestSchema = z
  .object({
    newPhone: z.string().min(1, 'newPhone is required'),
    currentPassword: z
      .string()
      .min(1, 'Current password is required')
      .refine((val) => Buffer.byteLength(val, 'utf8') <= 72, {
        message: 'Current password must not exceed 72 bytes',
      }),
    reason: z.string().trim().max(500, 'Reason must not exceed 500 characters').optional(),
  })
  .strict();
