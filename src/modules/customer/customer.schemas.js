import { z } from 'zod';

export const createReviewSchema = z
  .object({
    rating: z
      .coerce
      .number()
      .int()
      .min(1, 'Rating must be between 1 and 5')
      .max(5, 'Rating must be between 1 and 5'),
    comment: z.string().trim().max(1000, 'Comment must not exceed 1000 characters').optional(),
  })
  .strict();

export const updateReviewSchema = z
  .object({
    rating: z
      .coerce
      .number()
      .int()
      .min(1, 'Rating must be between 1 and 5')
      .max(5, 'Rating must be between 1 and 5')
      .optional(),
    comment: z.string().trim().max(1000, 'Comment must not exceed 1000 characters').optional(),
  })
  .strict()
  .refine((data) => data.rating !== undefined || data.comment !== undefined, {
    message: 'At least one field (rating or comment) must be provided',
  });

export const reportReviewSchema = z
  .object({
    reason: z
      .string()
      .trim()
      .min(3, 'Reason must be at least 3 characters')
      .max(500, 'Reason must not exceed 500 characters'),
  })
  .strict();
