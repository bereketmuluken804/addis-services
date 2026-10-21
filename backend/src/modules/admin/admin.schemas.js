import { z } from 'zod';

export const verificationTransitionSchema = z
  .object({
    status: z.enum(['APPROVED', 'REJECTED', 'REVOKED', 'PENDING']),
    rejectionReason: z.string().trim().min(3, 'Rejection reason must be at least 3 characters').optional(),
  })
  .superRefine((data, ctx) => {
    if ((data.status === 'REJECTED' || data.status === 'REVOKED') && !data.rejectionReason) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Rejection reason is required when rejecting or revoking verification',
        path: ['rejectionReason'],
      });
    }
  });

export const activationSchema = z
  .object({
    isActive: z.boolean(),
    reason: z.string().trim().min(3, 'Suspension reason must be at least 3 characters').optional(),
  })
  .superRefine((data, ctx) => {
    if (data.isActive === false && !data.reason) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Reason is required when suspending a provider',
        path: ['reason'],
      });
    }
  });

export const paginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const resetPasswordSchema = z
  .object({
    reason: z.string().trim().min(3, 'Reason must be at least 3 characters').optional(),
  })
  .strict();

export const moderateReviewSchema = z
  .object({
    status: z.enum(['HIDDEN', 'PUBLISHED']),
    reason: z.string().trim().min(3, 'Reason must be at least 3 characters'),
  })
  .strict();

export const adminPhoneChangeQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  status: z.enum(['PENDING', 'APPROVED', 'REJECTED', 'CANCELLED']).default('PENDING'),
});

export const decidePhoneChangeSchema = z
  .object({
    status: z.enum(['APPROVED', 'REJECTED']),
    rejectionReason: z.string().trim().min(3, 'Rejection reason must be at least 3 characters').optional(),
  })
  .strict()
  .superRefine((data, ctx) => {
    if (data.status === 'REJECTED' && !data.rejectionReason) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Rejection reason is required when rejecting a phone change request',
        path: ['rejectionReason'],
      });
    }
  });

export const adminProvidersQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  status: z.enum(['ALL', 'PENDING', 'APPROVED', 'REJECTED', 'REVOKED']).default('ALL'),
  isActive: z.enum(['ALL', 'true', 'false']).default('ALL'),
  categoryId: z.coerce.number().int().positive().optional(),
  search: z.string().trim().optional(),
});

export const adminReviewsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  status: z.enum(['ALL', 'PUBLISHED', 'HIDDEN']).default('ALL'),
  reportedOnly: z.enum(['true', 'false']).optional(),
  providerId: z.coerce.number().int().positive().optional(),
});

export const createCategorySchema = z
  .object({
    nameEn: z.string().trim().min(2).max(100),
    nameAm: z.string().trim().min(2).max(100),
    slug: z.string().trim().min(2).max(100).regex(/^[a-z0-9-]+$/, 'Slug must be alphanumeric with hyphens'),
    iconName: z.string().trim().min(1).max(50),
    displayOrder: z.coerce.number().int().default(0),
  })
  .strict();

export const updateCategorySchema = z
  .object({
    nameEn: z.string().trim().min(2).max(100).optional(),
    nameAm: z.string().trim().min(2).max(100).optional(),
    iconName: z.string().trim().min(1).max(50).optional(),
    displayOrder: z.coerce.number().int().optional(),
    isActive: z.boolean().optional(),
  })
  .strict();

export const createCitySchema = z
  .object({
    nameEn: z.string().trim().min(2).max(100),
    nameAm: z.string().trim().min(2).max(100),
    slug: z.string().trim().min(2).max(100).regex(/^[a-z0-9-]+$/, 'Slug must be alphanumeric with hyphens'),
  })
  .strict();

export const updateCitySchema = z
  .object({
    nameEn: z.string().trim().min(2).max(100).optional(),
    nameAm: z.string().trim().min(2).max(100).optional(),
    isActive: z.boolean().optional(),
  })
  .strict();

export const createSubCitySchema = z
  .object({
    cityId: z.coerce.number().int().positive(),
    nameEn: z.string().trim().min(2).max(100),
    nameAm: z.string().trim().min(2).max(100),
    slug: z.string().trim().min(2).max(100).regex(/^[a-z0-9-]+$/, 'Slug must be alphanumeric with hyphens'),
  })
  .strict();

export const updateSubCitySchema = z
  .object({
    nameEn: z.string().trim().min(2).max(100).optional(),
    nameAm: z.string().trim().min(2).max(100).optional(),
    isActive: z.boolean().optional(),
  })
  .strict();
