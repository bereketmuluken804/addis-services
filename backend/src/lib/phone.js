import { AppError } from '../middleware/errorHandler.js';

/**
 * Normalizes an Ethiopian phone number to E.164 format (+251[79]XXXXXXXX).
 * Per spec.md §9:
 * - Strip spaces, hyphens, and parentheses.
 * - Accept exactly:
 *   - 0[79]XXXXXXXX (10 digits starting with 07 or 09)
 *   - 251[79]XXXXXXXX (12 digits starting with 2517 or 2519)
 *   - +251[79]XXXXXXXX (13 chars starting with +2517 or +2519)
 * - Output: +251[79]XXXXXXXX
 * - Anything else is rejected with 422 INVALID_PHONE
 */
export function normalizePhone(input) {
  if (typeof input !== 'string') {
    throw new AppError(422, 'INVALID_PHONE', 'Phone number must be a string');
  }

  // Strip spaces, hyphens, and parentheses
  const cleaned = input.replace(/[\s\-()]/g, '');

  // Case 1: +251[79]XXXXXXXX (exactly 13 chars)
  if (/^\+251[79]\d{8}$/.test(cleaned)) {
    return cleaned;
  }

  // Case 2: 251[79]XXXXXXXX (exactly 12 digits)
  if (/^251[79]\d{8}$/.test(cleaned)) {
    return `+${cleaned}`;
  }

  // Case 3: 0[79]XXXXXXXX (exactly 10 digits)
  if (/^0[79]\d{8}$/.test(cleaned)) {
    return `+251${cleaned.slice(1)}`;
  }

  // Reject everything else (bare 9-digit numbers, landlines, foreign numbers, malformed)
  throw new AppError(
    422,
    'INVALID_PHONE',
    'Phone number must be a valid Ethiopian mobile number (+251 7/9XXXXXXXX)'
  );
}
