import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { app } from '../../src/app.js';
import { db } from '../../src/db/client.js';
import { signAccessToken } from '../../src/lib/tokens.js';

describe('Render Readiness & Deployment Verification (spec §11, §14, M8)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('Health Check (GET /healthz)', () => {
    it('responds with 200 { status: "ok" } when database connection is healthy', async () => {
      vi.spyOn(db, 'execute').mockResolvedValueOnce([{ '?column?': 1 }]);

      const res = await request(app).get('/healthz');

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ status: 'ok' });
    });

    it('responds with 503 SERVICE_UNAVAILABLE when database check fails without exposing secrets', async () => {
      vi.spyOn(db, 'execute').mockRejectedValueOnce(new Error('Connection failure'));

      const res = await request(app).get('/healthz');

      expect(res.status).toBe(503);
      expect(res.body).toEqual({
        error: {
          code: 'SERVICE_UNAVAILABLE',
          message: 'Database connectivity check failed',
        },
      });
    });
  });

  describe('Proxy Configuration & req.ip Resolution', () => {
    it('extracts real client IP from X-Forwarded-For when TRUST_PROXY_HOPS is configured', async () => {
      // In app.js: app.set('trust proxy', env.TRUST_PROXY_HOPS)
      // With trust proxy = 1, Express trusts the immediate reverse proxy (Render)
      // and sets req.ip to the client IP in X-Forwarded-For
      const clientIp = '198.51.100.42';

      // Use a test endpoint that relies on req.ip (e.g. POST /api/leads/call)
      // Mock db query for provider lookup
      const mockProvider = {
        id: 77,
        fullName: 'Test Plumber',
        verificationStatus: 'APPROVED',
        isActive: true,
      };

      vi.spyOn(db, 'select').mockImplementation(() => ({
        from: () => ({
          where: () => ({
            limit: () => Promise.resolve([mockProvider]),
          }),
        }),
      }));

      // Mock transaction for advisory lock and dedup insert
      let capturedIpHash = null;
      vi.spyOn(db, 'transaction').mockImplementation(async (callback) => {
        const mockTx = {
          execute: () => Promise.resolve(),
          select: () => ({
            from: () => ({
              where: () => ({
                limit: () => Promise.resolve([]), // no previous click
              }),
            }),
          }),
          insert: () => ({
            values: (val) => {
              capturedIpHash = val.clientIpHmac;
              return Promise.resolve();
            },
          }),
          update: () => ({
            set: () => ({
              where: () => Promise.resolve(),
            }),
          }),
        };
        return await callback(mockTx);
      });

      const res = await request(app)
        .post('/api/leads/call')
        .set('X-Forwarded-For', clientIp)
        .send({ providerId: 77 });

      expect(res.status).toBe(200);
      expect(res.body.data.recorded).toBe(true);
      expect(capturedIpHash).toBeDefined();
      expect(capturedIpHash).toHaveLength(64); // SHA256 hex string
    });
  });

  describe('Smoke Workflow Integration Check', () => {
    const adminToken = signAccessToken({ sub: 1, role: 'ADMIN' });
    const providerId = 99;

    it('validates the complete admin approve -> activate -> public listing sequence', async () => {
      // 1. Admin approve verification
      const mockProvider = {
        id: providerId,
        fullName: 'Smoke Plumber',
        verificationStatus: 'PENDING',
        isActive: false,
      };

      const mockPendingDoc = {
        id: 10,
        providerId,
        status: 'PENDING',
      };

      const mockApprovedProvider = {
        ...mockProvider,
        verificationStatus: 'APPROVED',
      };

      vi.spyOn(db, 'transaction').mockImplementation(async (callback) => {
        const mockTx = {
          select: () => ({
            from: () => ({
              where: () => ({
                limit: () => Promise.resolve([mockProvider]),
                orderBy: () => ({
                  limit: () => Promise.resolve([mockPendingDoc]),
                }),
              }),
            }),
          }),
          update: () => ({
            set: () => ({
              where: () => ({
                returning: () => Promise.resolve([mockApprovedProvider]),
              }),
            }),
          }),
          insert: () => ({
            values: () => Promise.resolve(),
          }),
        };
        return await callback(mockTx);
      });

      // Admin verification PATCH
      const resVerify = await request(app)
        .patch(`/api/admin/providers/${providerId}/verification`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'APPROVED' });

      expect(resVerify.status).toBe(200);
      expect(resVerify.body.data.verificationStatus).toBe('APPROVED');

      // 2. Admin activate provider
      const mockActiveProvider = {
        ...mockApprovedProvider,
        isActive: true,
      };

      vi.spyOn(db, 'select').mockImplementation(() => ({
        from: () => ({
          where: () => ({
            limit: () => Promise.resolve([mockApprovedProvider]),
          }),
        }),
      }));

      vi.spyOn(db, 'transaction').mockImplementation(async (callback) => {
        const mockTx = {
          select: () => ({
            from: () => ({
              where: () => ({
                limit: () => Promise.resolve([mockApprovedProvider]),
              }),
            }),
          }),
          update: () => ({
            set: () => ({
              where: () => ({
                returning: () => Promise.resolve([mockActiveProvider]),
              }),
            }),
          }),
          insert: () => ({
            values: () => Promise.resolve(),
          }),
        };
        return await callback(mockTx);
      });

      const resActivate = await request(app)
        .patch(`/api/admin/providers/${providerId}/activation`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ isActive: true });

      expect(resActivate.status).toBe(200);
      expect(resActivate.body.data.isActive).toBe(true);

      // 3. Public directory list confirms active provider
      const mockPublicProvider = {
        id: providerId,
        fullName: 'Smoke Plumber',
        phone: '+251911223344',
        bio: 'Smoke test bio',
        experienceYears: 5,
        avatarUrl: null,
        workSamples: [],
        isAvailable: true,
        woreda: '01',
        category: { id: 1, nameEn: 'Plumbing', nameAm: 'የቧንቧ ስራ', slug: 'plumbing', iconName: 'wrench' },
        city: { id: 1, nameEn: 'Addis Ababa', nameAm: 'አዲስ አበባ' },
        subCity: { id: 1, nameEn: 'Bole', nameAm: 'ቦሌ' },
        reviewStats: { averageRating: 0, reviewCount: 0 },
      };

      vi.spyOn(db, 'select').mockImplementation(() => ({
        from: () => ({
          innerJoin: () => ({
            innerJoin: () => ({
              innerJoin: () => ({
                leftJoin: () => ({
                  where: () => ({
                    groupBy: () => ({
                      limit: () => ({
                        offset: () => Promise.resolve([mockPublicProvider]),
                      }),
                    }),
                  }),
                }),
              }),
            }),
          }),
          where: () => Promise.resolve([{ totalCount: 1 }]),
        }),
      }));

      const resPublic = await request(app).get('/api/providers?categoryId=1');

      expect(resPublic.status).toBe(200);
      expect(resPublic.body.data).toHaveLength(1);
      expect(resPublic.body.data[0].id).toBe(providerId);
    });
  });
});
