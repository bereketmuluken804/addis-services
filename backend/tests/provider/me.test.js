import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { app } from '../../src/app.js';
import { db } from '../../src/db/client.js';
import { signAccessToken } from '../../src/lib/tokens.js';
import { getStorage } from '../../src/lib/storage/index.js';

describe('Provider Me & Resubmission (src/modules/provider/provider.routes.js)', () => {
  const storage = getStorage();

  const providerId = 15;
  const providerToken = signAccessToken({ sub: providerId, role: 'PROVIDER' });

  const validMockProvider = {
    id: providerId,
    fullName: 'Solomon Barega',
    phone: '+251911445566',
    passwordHash: 'secret_hash',
    cityId: 1,
    subCityId: 2,
    categoryId: 3,
    bio: 'Professional plumber',
    verificationStatus: 'REJECTED',
    verificationRejectionReason: 'Blurry photo',
    isActive: false,
    isAvailable: false,
    mustChangePassword: false,
  };

  beforeEach(() => {
    vi.restoreAllMocks();
    storage.clear();

    // Default mock for provider row lookup
    vi.spyOn(db, 'select').mockImplementation(() => ({
      from: () => ({
        where: () => ({
          limit: () => Promise.resolve([validMockProvider]),
        }),
      }),
    }));
  });

  it('GET /api/provider/me returns safe profile and totalCallsReceived without password hash', async () => {
    let call = 0;
    vi.spyOn(db, 'select').mockImplementation(() => ({
      from: () => ({
        where: () => {
          call++;
          if (call === 1) return { limit: () => Promise.resolve([validMockProvider]) };
          if (call === 2) return Promise.resolve([{ totalCalls: 7 }]);
          return { limit: () => Promise.resolve([{ id: 1, nameEn: "Plumbing", nameAm: "የቧንቧ ስራ" }]) };
        },
      }),
    }));

    const res = await request(app)
      .get('/api/provider/me')
      .set('Authorization', `Bearer ${providerToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.id).toBe(providerId);
    expect(res.body.data.totalCallsReceived).toBe(7);
    expect(res.body.data).not.toHaveProperty('passwordHash');
  });

  it('PATCH /api/provider/me allows updating allowlisted fields only and rejects mass assignment', async () => {
    vi.spyOn(db, 'select').mockImplementation(() => ({
      from: () => ({
        where: () => ({
          limit: () => Promise.resolve([validMockProvider]),
        }),
      }),
    }));

    // Attempting to inject admin-only fields: isActive and verificationStatus
    const res = await request(app)
      .patch('/api/provider/me')
      .set('Authorization', `Bearer ${providerToken}`)
      .send({
        bio: 'Updated bio here',
        isActive: true, // Should be rejected by strict schema
      });

    // Zod strict() schema catches unknown field
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('PATCH /api/provider/me/availability updates isAvailable badge only', async () => {
    vi.spyOn(db, 'update').mockImplementation(() => ({
      set: () => ({
        where: () => ({
          returning: () => Promise.resolve([{ isAvailable: true }]),
        }),
      }),
    }));

    const res = await request(app)
      .patch('/api/provider/me/availability')
      .set('Authorization', `Bearer ${providerToken}`)
      .send({ isAvailable: true });

    expect(res.status).toBe(200);
    expect(res.body.data).toEqual({ isAvailable: true });
  });

  describe('§7 Resubmission Rule', () => {
    const validJpegBytes = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01]);

    it('allows document resubmission when provider is REJECTED and no document is PENDING', async () => {
      let selectCall = 0;
      vi.spyOn(db, 'select').mockImplementation(() => ({
        from: () => ({
          where: () => ({
            limit: () => {
              selectCall++;
              if (selectCall === 1) return Promise.resolve([{ ...validMockProvider, verificationStatus: 'REJECTED' }]);
              return Promise.resolve([]); // No open pending document
            },
          }),
        }),
      }));

      vi.spyOn(db, 'transaction').mockImplementation(async (callback) => {
        const mockTx = {
          insert: () => ({ values: () => Promise.resolve() }),
          update: () => ({ set: () => ({ where: () => Promise.resolve() }) }),
        };
        return await callback(mockTx);
      });

      const res = await request(app)
        .post('/api/provider/me/verification-document')
        .set('Authorization', `Bearer ${providerToken}`)
        .attach('idDocument', validJpegBytes, 'replacement-id.jpg');

      expect(res.status).toBe(201);
      expect(res.body.data.status).toBe('PENDING');
      expect(storage.files.size).toBe(1);
    });

    it('blocks resubmission with 409 when a document is already PENDING', async () => {
      let selectCall = 0;
      vi.spyOn(db, 'select').mockImplementation(() => ({
        from: () => ({
          where: () => ({
            limit: () => {
              selectCall++;
              if (selectCall === 1) return Promise.resolve([{ ...validMockProvider, verificationStatus: 'PENDING' }]);
              return Promise.resolve([{ id: 1, status: 'PENDING' }]); // Open pending document exists!
            },
          }),
        }),
      }));

      const res = await request(app)
        .post('/api/provider/me/verification-document')
        .set('Authorization', `Bearer ${providerToken}`)
        .attach('idDocument', validJpegBytes, 'another-id.jpg');

      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe('PENDING_DOCUMENT_EXISTS');
    });

    it('blocks resubmission with 409 when provider is APPROVED', async () => {
      vi.spyOn(db, 'select').mockImplementation(() => ({
        from: () => ({
          where: () => ({
            limit: () => Promise.resolve([{ ...validMockProvider, verificationStatus: 'APPROVED' }]),
          }),
        }),
      }));

      const res = await request(app)
        .post('/api/provider/me/verification-document')
        .set('Authorization', `Bearer ${providerToken}`)
        .attach('idDocument', validJpegBytes, 'unnecessary-id.jpg');

      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe('INVALID_STATE');
    });
  });
});
