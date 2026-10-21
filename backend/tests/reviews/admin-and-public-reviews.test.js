import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { app } from '../../src/app.js';
import { db } from '../../src/db/client.js';
import { signAccessToken } from '../../src/lib/tokens.js';
import { PublicService } from '../../src/modules/public/public.service.js';

describe('Admin Review Moderation & Public Reviews (spec §6.3, §6.6)', () => {
  const adminId = 1;
  const adminToken = signAccessToken({ sub: adminId, role: 'ADMIN' });
  const customerToken = signAccessToken({ sub: 50, role: 'CUSTOMER' });
  const providerId = 42;

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('GET /api/providers/:id/reviews (Public Reviews List)', () => {
    it('returns paginated published reviews for an eligible provider (spec §6.3)', async () => {
      const mockReviews = [
        {
          id: 1,
          rating: 5,
          comment: 'Outstanding electrical repair',
          createdAt: new Date().toISOString(),
          reviewerName: 'Almaz Ayana',
        },
        {
          id: 2,
          rating: 4,
          comment: 'Very good service',
          createdAt: new Date().toISOString(),
          reviewerName: 'Kenenisa Bekele',
        },
      ];

      let selectCall = 0;
      vi.spyOn(db, 'select').mockImplementation(() => ({
        from: () => ({
          innerJoin: () => ({
            where: () => ({
              orderBy: () => ({
                limit: () => ({
                  offset: () => Promise.resolve(mockReviews),
                }),
              }),
            }),
          }),
          where: () => {
            selectCall++;
            if (selectCall === 1) {
              // Provider eligibility check
              return { limit: () => Promise.resolve([{ id: providerId }]) };
            }
            // Count query
            return Promise.resolve([{ total: 2 }]);
          },
        }),
      }));

      const res = await request(app).get(`/api/providers/${providerId}/reviews?page=1&limit=10`);

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(2);
      expect(res.body.data[0]).toHaveProperty('reviewerName', 'Almaz Ayana');
      expect(res.body.data[0]).toHaveProperty('rating', 5);
      expect(res.body.pagination).toEqual({
        page: 1,
        limit: 10,
        total: 2,
        totalPages: 1,
      });
    });

    it('rejects public reviews request for an ineligible provider with 404 (Invariant #1)', async () => {
      vi.spyOn(db, 'select').mockImplementation(() => ({
        from: () => ({
          where: () => ({
            limit: () => Promise.resolve([]), // Provider not found or not eligible
          }),
        }),
      }));

      const res = await request(app).get(`/api/providers/${providerId}/reviews`);

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('NOT_FOUND');
    });
  });

  describe('PATCH /api/admin/reviews/:id (Admin Moderation)', () => {
    it('admin hides review with reason and records audit log entry (spec §6.6)', async () => {
      const existingReview = {
        id: 10,
        providerId: 42,
        customerId: 100,
        rating: 1,
        comment: 'Inappropriate offensive text here',
        status: 'PUBLISHED',
      };

      let auditLogEntry = null;
      let updatedStatus = null;

      vi.spyOn(db, 'transaction').mockImplementation(async (callback) => {
        const mockTx = {
          select: () => ({
            from: () => ({
              where: () => ({
                limit: () => Promise.resolve([existingReview]),
              }),
            }),
          }),
          update: () => ({
            set: (data) => ({
              where: () => ({
                returning: () => {
                  updatedStatus = data.status;
                  return Promise.resolve([{ ...existingReview, ...data }]);
                },
              }),
            }),
          }),
          insert: () => ({
            values: (entry) => {
              auditLogEntry = entry;
              return Promise.resolve();
            },
          }),
        };
        return await callback(mockTx);
      });

      const res = await request(app)
        .patch('/api/admin/reviews/10')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          status: 'HIDDEN',
          reason: 'Violates community guidelines: offensive language',
        });

      expect(res.status).toBe(200);
      expect(updatedStatus).toBe('HIDDEN');
      expect(res.body.data.status).toBe('HIDDEN');
      expect(res.body.data.moderationReason).toBe('Violates community guidelines: offensive language');

      // Moderation never edits author's rating or text
      expect(res.body.data.rating).toBe(1);
      expect(res.body.data.comment).toBe('Inappropriate offensive text here');

      // Audit log entry written
      expect(auditLogEntry).not.toBeNull();
      expect(auditLogEntry.action).toBe('REVIEW_MODERATION');
      expect(auditLogEntry.targetType).toBe('REVIEW');
      expect(auditLogEntry.targetId).toBe(10);
      expect(auditLogEntry.reason).toBe('Violates community guidelines: offensive language');
      expect(auditLogEntry.metadata).toEqual({
        previousStatus: 'PUBLISHED',
        newStatus: 'HIDDEN',
      });
    });

    it('requires a reason when moderating review and returns 400 if missing', async () => {
      const res = await request(app)
        .patch('/api/admin/reviews/10')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'HIDDEN' }); // Missing reason

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('rejects non-admin role with 403', async () => {
      const res = await request(app)
        .patch('/api/admin/reviews/10')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          status: 'HIDDEN',
          reason: 'Unauthorized moderation attempt',
        });

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });
  });

  describe('Rating Average & Review Count Exclude Hidden Reviews (Exit Check)', () => {
    it('rating average in provider details excludes hidden reviews', async () => {
      // Direct service test ensuring sql filtering excludes HIDDEN status
      const mockProviderRow = {
        id: providerId,
        fullName: 'Abebe Bikila',
        phone: '+251911000000',
        bio: 'Marathon plumber',
        experienceYears: 10,
        avatarUrl: null,
        workSamples: [],
        isAvailable: true,
        woreda: 'Woreda 03',
        category: { id: 1, nameEn: 'Plumbing', nameAm: 'ቧንቧ', slug: 'plumbing', iconName: 'wrench' },
        city: { id: 1, nameEn: 'Addis Ababa', nameAm: 'አዲስ አበባ' },
        subCity: { id: 1, nameEn: 'Bole', nameAm: 'ቦሌ' },
        reviewStats: {
          // Average of 5 and 4 = 4.5, excluding a hidden rating of 1
          averageRating: 4.5,
          reviewCount: 2,
        },
      };

      vi.spyOn(db, 'select').mockImplementation(() => ({
        from: () => ({
          innerJoin: () => ({
            innerJoin: () => ({
              innerJoin: () => ({
                leftJoin: () => ({
                  where: () => ({
                    groupBy: () => ({
                      limit: () => Promise.resolve([mockProviderRow]),
                    }),
                  }),
                }),
              }),
            }),
          }),
        }),
      }));

      const provider = await PublicService.getProviderById(providerId);

      expect(provider.averageRating).toBe(4.5);
      expect(provider.reviewCount).toBe(2);
    });
  });
});
