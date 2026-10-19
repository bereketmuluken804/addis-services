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
