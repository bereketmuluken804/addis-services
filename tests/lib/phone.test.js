import { describe, it, expect } from 'vitest';
import { normalizePhone } from '../../src/lib/phone.js';

describe('Phone Number Normalization (src/lib/phone.js)', () => {
  describe('Accepted Forms', () => {
    it.each([
      // 09xxxxxxxx formats
      ['0911234567', '+251911234567'],
      ['09 11 23 45 67', '+251911234567'],
      ['09-11-23-45-67', '+251911234567'],
      ['(0911) 234567', '+251911234567'],
      ['091-123-(4567)', '+251911234567'],

      // 07xxxxxxxx formats (Safaricom)
      ['0711234567', '+251711234567'],
      ['07 12 34 56 78', '+251712345678'],
      ['(0712) 345678', '+251712345678'],

      // 2519xxxxxxxx / 2517xxxxxxxx formats
      ['251911234567', '+251911234567'],
      ['251711234567', '+251711234567'],
      ['251 911 234 567', '+251911234567'],
      ['251-711-234-567', '+251711234567'],

      // +2519xxxxxxxx / +2517xxxxxxxx formats
      ['+251911234567', '+251911234567'],
      ['+251711234567', '+251711234567'],
      ['+251 911 234 567', '+251911234567'],
      ['+251 (911) 234-567', '+251911234567'],
      ['+251-711-234-567', '+251711234567'],
    ])('accepts %s and normalizes to %s', (input, expected) => {
      expect(normalizePhone(input)).toBe(expected);
    });
  });

  describe('Rejected Forms (422 INVALID_PHONE)', () => {
    it.each([
      // Bare 9 digits (no leading 0, +251, or 251)
      ['911234567'],
      ['711234567'],

      // Landlines (e.g. 011...)
      ['0111234567'],
      ['+251111234567'],
      ['251111234567'],

      // Wrong prefix (not 7 or 9)
      ['0811234567'],
      ['+251811234567'],
      ['0611234567'],
      ['+251511234567'],

      // Too short / too long
      ['091123456'],       // 9 digits total
      ['09112345678'],     // 11 digits total
      ['+25191123456'],    // too short
      ['+2519112345678'],  // too long

      // Foreign numbers
      ['+14155552671'],
      ['+447911123456'],
      ['+254712345678'],

      // Malformed / Non-numeric
      ['+25191123456a'],
      ['abc-def-ghij'],
      [''],
      ['   '],
      ['+251-911-234-567-extra'],
    ])('rejects invalid number %s with 422 INVALID_PHONE', (input) => {
      expect(() => normalizePhone(input)).toThrowError(/Phone number must be a valid Ethiopian mobile number/);
      try {
        normalizePhone(input);
      } catch (err) {
        expect(err.statusCode).toBe(422);
        expect(err.code).toBe('INVALID_PHONE');
      }
    });

    it('rejects non-string input', () => {
      expect(() => normalizePhone(null)).toThrow();
      expect(() => normalizePhone(undefined)).toThrow();
      expect(() => normalizePhone(911234567)).toThrow();
    });
  });
});
