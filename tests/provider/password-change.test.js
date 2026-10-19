import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { app } from '../../src/app.js';
import { db } from '../../src/db/client.js';
import { signAccessToken } from '../../src/lib/tokens.js';
import { hashPassword, comparePassword } from '../../src/lib/crypto.js';
import * as schema from '../../src/db/schema.js';

describe('Provider Password Change & mustChangePassword Gating (spec §4.2, §6.4)', () => {
  const providerId = 20;
  const providerToken = signAccessToken({ sub: providerId, role: 'PROVIDER' });

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  const temporaryPassword = 'TempPassword123!';

  it('gated provider (mustChangePassword=true) is blocked from general provider endpoints with 403 (spec §4.2)', async () => {
    const tempHash = await hashPassword(temporaryPassword);

    const gatedProvider = {
      id: providerId,
      fullName: 'Gated Provider',
      phone: '+251911998877',
      passwordHash: tempHash,
      mustChangePassword: true,
      verificationStatus: 'APPROVED',
      isActive: true,
      isAvailable: true,
    };

    vi.spyOn(db, 'select').mockImplementation(() => ({
      from: () => ({
        where: () => ({
          limit: () => Promise.resolve([gatedProvider]),
        }),
      }),
    }));

    // 1. GET /api/provider/me is blocked
    const resGet = await request(app)
      .get('/api/provider/me')
      .set('Authorization', `Bearer ${providerToken}`);
    expect(resGet.status).toBe(403);
    expect(resGet.body.error.code).toBe('PASSWORD_CHANGE_REQUIRED');

    // 2. PATCH /api/provider/me is blocked
    const resPatch = await request(app)
      .patch('/api/provider/me')
      .set('Authorization', `Bearer ${providerToken}`)
      .send({ bio: 'New bio' });
    expect(resPatch.status).toBe(403);
    expect(resPatch.body.error.code).toBe('PASSWORD_CHANGE_REQUIRED');

    // 3. PATCH /api/provider/me/availability is blocked
    const resAvailability = await request(app)
      .patch('/api/provider/me/availability')
      .set('Authorization', `Bearer ${providerToken}`)
      .send({ isAvailable: false });
    expect(resAvailability.status).toBe(403);
    expect(resAvailability.body.error.code).toBe('PASSWORD_CHANGE_REQUIRED');

    // 4. POST /api/provider/me/verification-document is blocked
    const resDoc = await request(app)
      .post('/api/provider/me/verification-document')
      .set('Authorization', `Bearer ${providerToken}`)
      .send();
    expect(resDoc.status).toBe(403);
    expect(resDoc.body.error.code).toBe('PASSWORD_CHANGE_REQUIRED');
  });

  it('gated provider can reach PATCH /api/provider/me/password and change password', async () => {
    const tempHash = await hashPassword(temporaryPassword);

    const gatedProvider = {
      id: providerId,
      fullName: 'Gated Provider',
      phone: '+251911998877',
      passwordHash: tempHash,
      mustChangePassword: true,
      verificationStatus: 'APPROVED',
      isActive: true,
    };

    vi.spyOn(db, 'select').mockImplementation(() => ({
      from: () => ({
        where: () => ({
          limit: () => Promise.resolve([gatedProvider]),
        }),
      }),
    }));

    let updatedProviderData = null;
    let revokedOldTokens = false;
    let insertedNewToken = false;

    vi.spyOn(db, 'transaction').mockImplementation(async (callback) => {
      const mockTx = {
        update: (table) => ({
          set: (data) => ({
            where: () => {
              if (table === schema.providers) {
                updatedProviderData = data;
              } else if (table === schema.refreshTokens) {
                revokedOldTokens = true;
              }
              return Promise.resolve();
            },
          }),
        }),
        insert: () => ({
          values: () => {
            insertedNewToken = true;
            return Promise.resolve();
          },
        }),
      };
      return await callback(mockTx);
    });

    const newPassword = 'NewBrandSecurePassword2026!';
    const res = await request(app)
      .patch('/api/provider/me/password')
      .set('Authorization', `Bearer ${providerToken}`)
      .send({
        currentPassword: temporaryPassword,
        newPassword,
      });

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveProperty('accessToken');
    expect(res.headers['set-cookie']).toBeDefined();

    // Check provider row updated
    expect(updatedProviderData.mustChangePassword).toBe(false);
    const isNewPasswordHashed = await comparePassword(newPassword, updatedProviderData.passwordHash);
    expect(isNewPasswordHashed).toBe(true);

    // Check old sessions revoked and new session inserted
    expect(revokedOldTokens).toBe(true);
    expect(insertedNewToken).toBe(true);
  });

  it('rejects wrong current password with 401 INVALID_CREDENTIALS', async () => {
    const tempHash = await hashPassword(temporaryPassword);

    const mockProvider = {
      id: providerId,
      passwordHash: tempHash,
      mustChangePassword: false,
    };

    vi.spyOn(db, 'select').mockImplementation(() => ({
      from: () => ({
        where: () => ({
          limit: () => Promise.resolve([mockProvider]),
        }),
      }),
    }));

    const res = await request(app)
      .patch('/api/provider/me/password')
      .set('Authorization', `Bearer ${providerToken}`)
      .send({
        currentPassword: 'WrongPassword123!',
        newPassword: 'ValidNewPassword123!',
      });

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('INVALID_CREDENTIALS');
  });

  it('rejects new password under 8 characters or over 72 bytes', async () => {
    vi.spyOn(db, 'select').mockImplementation(() => ({
      from: () => ({
        where: () => ({
          limit: () => Promise.resolve([{ id: providerId, mustChangePassword: false }]),
        }),
      }),
    }));

    const resShort = await request(app)
      .patch('/api/provider/me/password')
      .set('Authorization', `Bearer ${providerToken}`)
      .send({
        currentPassword: temporaryPassword,
        newPassword: 'short',
      });

    expect(resShort.status).toBe(400);
    expect(resShort.body.error.code).toBe('VALIDATION_ERROR');

    const resLong = await request(app)
      .patch('/api/provider/me/password')
      .set('Authorization', `Bearer ${providerToken}`)
      .send({
        currentPassword: temporaryPassword,
        newPassword: 'a'.repeat(73),
      });

    expect(resLong.status).toBe(400);
    expect(resLong.body.error.code).toBe('VALIDATION_ERROR');
  });
});
