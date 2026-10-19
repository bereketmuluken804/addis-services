import { z } from 'zod';
import { normalizePhone } from '../../lib/phone.js';

const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .refine(
    (val) => Buffer.byteLength(val, 'utf8') <= 72,
    'Password cannot exceed 72 bytes'
  );

const phoneSchema = z.string().transform((val, ctx) => {
  try {
    return normalizePhone(val);
  } catch (err) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: err.message,
    });
    return z.NEVER;
  }
});

export const providerRegisterSchema = z.object({
  fullName: z.string().trim().min(2, 'Full name is required').max(100),
  phone: phoneSchema,
  password: passwordSchema,
  cityId: z.coerce.number().int().positive('cityId is required'),
  subCityId: z.coerce.number().int().positive('subCityId is required'),
  categoryId: z.coerce.number().int().positive('categoryId is required'),
  woreda: z.string().trim().max(50).optional(),
  bio: z.string().trim().max(1000).optional(),
  experienceYears: z.coerce.number().int().min(0).max(60).optional(),
  avatarUrl: z.string().url().max(2048).optional(),
  workSamples: z
    .union([z.string(), z.array(z.string().url().max(2048))])
    .optional()
    .transform((val) => {
      if (!val) return [];
      if (typeof val === 'string') {
        try {
          const parsed = JSON.parse(val);
          return Array.isArray(parsed) ? parsed : [];
        } catch {
          return [];
        }
      }
      return val;
    }),
});

export const customerRegisterSchema = z.object({
  fullName: z.string().trim().min(2, 'Full name is required').max(100),
  phone: phoneSchema,
  password: passwordSchema,
});

export const phoneLoginSchema = z.object({
  phone: phoneSchema,
  password: z.string().min(1, 'Password is required'),
});

export const adminLoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1, 'Password is required'),
});
