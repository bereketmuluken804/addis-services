import { z } from 'zod';

export const callClickSchema = z.object({
  providerId: z.coerce.number().int().positive('providerId must be a positive integer'),
});
