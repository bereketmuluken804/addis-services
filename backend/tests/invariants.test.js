import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { app } from '../src/app.js';
import { isPubliclyEligible } from '../src/db/schema.js';
import { normalizePhone } from '../src/lib/phone.js';
import { updateProfileSchema, updateAvailabilitySchema } from '../src/modules/provider/provider.schemas.js';
import { signAccessToken, verifyAccessToken, hashToken } from '../src/lib/tokens.js';

describe('Core Architecture Invariants (AGENTS.md & spec.md)', () => {
  // Invariant #1: Public eligibility is verificationStatus = 'APPROVED' AND isActive = true
  it('Invariant #1: exports shared isPubliclyEligible SQL helper', () => {
    expect(isPubliclyEligible).toBeDefined();
    expect(isPubliclyEligible).toHaveProperty('queryChunks');
  });

  // Invariant #2: verificationStatus and isActive are admin-only; provider cannot write them
  it('Invariant #2: updateProfileSchema strictly rejects verificationStatus and isActive', () => {
    const invalidPayload1 = {
      fullName: 'Abebe Kebede',
      verificationStatus: 'APPROVED',
    };
    const res1 = updateProfileSchema.safeParse(invalidPayload1);
    expect(res1.success).toBe(false);

    const invalidPayload2 = {
      isActive: true,
    };
    const res2 = updateProfileSchema.safeParse(invalidPayload2);
    expect(res2.success).toBe(false);

    const availPayload = {
      isAvailable: true,
    };
    const res3 = updateAvailabilitySchema.safeParse(availPayload);
    expect(res3.success).toBe(true);
  });

  // Invariant #6: E.164 Ethiopian phone normalization +251[79]XXXXXXXX
  it('Invariant #6: normalizePhone accepts only valid mobile numbers and rejects invalid', () => {
    expect(normalizePhone('0911234567')).toBe('+251911234567');
    expect(normalizePhone('+251911234567')).toBe('+251911234567');
    expect(normalizePhone('0711234567')).toBe('+251711234567');
    expect(normalizePhone('251711234567')).toBe('+251711234567');

    // Landline or invalid prefixes must be rejected
    expect(() => normalizePhone('0111234567')).toThrow();
    expect(() => normalizePhone('+12025550123')).toThrow();
    expect(() => normalizePhone('invalid')).toThrow();
  });

  // Invariant #7: Access JWT HS256, pinned algorithm, SHA-256 refresh tokens
  it('Invariant #7: signs and pins HS256 algorithm and hashes refresh tokens with SHA-256', () => {
    const payload = { sub: '123', role: 'PROVIDER' };
    const token = signAccessToken(payload);
    expect(typeof token).toBe('string');

    const decoded = verifyAccessToken(token);
    expect(decoded.sub).toBe('123');
    expect(decoded.role).toBe('PROVIDER');

    const hashed = hashToken('sample-refresh-token');
    expect(hashed).toHaveLength(64); // SHA-256 hex string is 64 characters
  });

  // Invariant #8: No mass assignment - unknown properties rejected
  it('Invariant #8: write schemas enforce strict property allowlists', () => {
    const maliciousPayload = {
      fullName: 'Valid Name',
      isAdmin: true,
      hacked: 1,
    };
    const result = updateProfileSchema.safeParse(maliciousPayload);
    expect(result.success).toBe(false);
  });

  // Invariant #9: Shared error envelope { error: { code, message } }
  it('Invariant #9: standard error responses conform to { error: { code, message } }', async () => {
    const res = await request(app).get('/api/providers/invalid-id-not-a-number');
    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
    expect(res.body.error).toHaveProperty('code');
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(res.body.error).toHaveProperty('message');
  });
});
