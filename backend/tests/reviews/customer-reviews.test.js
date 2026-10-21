import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { app } from '../../src/app.js';
import { db } from '../../src/db/client.js';
import { signAccessToken } from '../../src/lib/tokens.js';

describe('Customer Reviews (src/modules/customer/customer.routes.js)', () => {
  const customerId = 100;
  const otherCustomerId = 101;
  const providerId = 50;

  const customerToken = signAccessToken({ sub: customerId, role: 'CUSTOMER' });
  const otherCustomerToken = signAccessToken({ sub: otherCustomerId, role: 'CUSTOMER' });
  const providerToken = signAccessToken({ sub: providerId, role: 'PROVIDER' });

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('POST /api/providers/:id/reviews (Create Review)', () => {
    it('creates review for an eligible provider (spec §6.5)', async () => {
      // Provider exists and is eligible
      vi.spyOn(db, 'select').mockImplementation(() => ({
        from: () => ({
          where: () => ({
            limit: () => Promise.resolve([{ id: providerId }]),
          }),
        }),
      }));

      const mockCreatedReview = {
        id: 1,
        providerId,
        customerId,
        rating: 5,
        comment: 'Excellent plumbing work!',
        status: 'PUBLISHED',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.spyOn(db, 'insert').mockImplementation(() => ({
        values: () => ({
          returning: () => Promise.resolve([mockCreatedReview]),
        }),
      }));

      const res = await request(app)
        .post(`/api/providers/${providerId}/reviews`)
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          rating: 5,
          comment: 'Excellent plumbing work!',
        });

      expect(res.status).toBe(201);
      expect(res.body.data.id).toBe(1);
      expect(res.body.data.rating).toBe(5);
      expect(res.body.data.comment).toBe('Excellent plumbing work!');
      expect(res.body.data.status).toBe('PUBLISHED');
    });

    it('rejects review creation for ineligible or non-existent provider with 404 (Invariant #1)', async () => {
      vi.spyOn(db, 'select').mockImplementation(() => ({
        from: () => ({
          where: () => ({
            limit: () => Promise.resolve([]), // Provider not found or ineligible
          }),
        }),
      }));

      const res = await request(app)
        .post(`/api/providers/${providerId}/reviews`)
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          rating: 4,
          comment: 'Good service',
        });

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('NOT_FOUND');
    });

    it('enforces one review per customer per provider (DB unique constraint) returning 409 (Exit Check)', async () => {
      vi.spyOn(db, 'select').mockImplementation(() => ({
        from: () => ({
          where: () => ({
            limit: () => Promise.resolve([{ id: providerId }]),
          }),
        }),
      }));

      // Simulate Postgres unique constraint violation error '23505'
      vi.spyOn(db, 'insert').mockImplementation(() => ({
        values: () => ({
          returning: () => {
            const err = new Error('duplicate key value violates unique constraint');
            err.code = '23505';
            return Promise.reject(err);
          },
        }),
      }));

      const res = await request(app)
        .post(`/api/providers/${providerId}/reviews`)
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          rating: 5,
          comment: 'Second review attempt',
        });

      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe('DUPLICATE_REVIEW');
    });

    it('validates rating is between 1 and 5 and rejects invalid rating with 400', async () => {
      const resUnder = await request(app)
        .post(`/api/providers/${providerId}/reviews`)
        .set('Authorization', `Bearer ${customerToken}`)
        .send({ rating: 0 });

      expect(resUnder.status).toBe(400);
      expect(resUnder.body.error.code).toBe('VALIDATION_ERROR');

      const resOver = await request(app)
        .post(`/api/providers/${providerId}/reviews`)
        .set('Authorization', `Bearer ${customerToken}`)
        .send({ rating: 6 });

      expect(resOver.status).toBe(400);
      expect(resOver.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('rejects non-customer role (e.g. PROVIDER) with 403', async () => {
      const res = await request(app)
        .post(`/api/providers/${providerId}/reviews`)
        .set('Authorization', `Bearer ${providerToken}`)
        .send({ rating: 5 });

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });
  });

  describe('PATCH /api/reviews/:id (Edit Review)', () => {
    it('allows review owner to edit rating and comment (spec §6.5)', async () => {
      const existingReview = {
        id: 1,
        providerId,
        customerId, // Owner
        rating: 4,
        comment: 'Initial comment',
        status: 'PUBLISHED',
      };

      vi.spyOn(db, 'select').mockImplementation(() => ({
        from: () => ({
          where: () => ({
            limit: () => Promise.resolve([existingReview]),
          }),
        }),
      }));

      const updatedReview = {
        ...existingReview,
        rating: 5,
        comment: 'Updated: really great service!',
      };

      vi.spyOn(db, 'update').mockImplementation(() => ({
        set: () => ({
          where: () => ({
            returning: () => Promise.resolve([updatedReview]),
          }),
        }),
      }));

      const res = await request(app)
        .patch('/api/reviews/1')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          rating: 5,
          comment: 'Updated: really great service!',
        });

      expect(res.status).toBe(200);
      expect(res.body.data.rating).toBe(5);
      expect(res.body.data.comment).toBe('Updated: really great service!');
    });

    it('enforces ownership check: rejects non-owner edit with 403 (Exit Check)', async () => {
      const existingReview = {
        id: 1,
        providerId,
        customerId, // Owned by customerId
        rating: 4,
        comment: 'Original',
      };

      vi.spyOn(db, 'select').mockImplementation(() => ({
        from: () => ({
          where: () => ({
            limit: () => Promise.resolve([existingReview]),
          }),
        }),
      }));

      const res = await request(app)
        .patch('/api/reviews/1')
        .set('Authorization', `Bearer ${otherCustomerToken}`) // other customer
        .send({ rating: 1 });

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    it('returns 404 for editing non-existent review', async () => {
      vi.spyOn(db, 'select').mockImplementation(() => ({
        from: () => ({
          where: () => ({
            limit: () => Promise.resolve([]),
          }),
        }),
      }));

      const res = await request(app)
        .patch('/api/reviews/999')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({ rating: 5 });

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('NOT_FOUND');
    });
  });

  describe('DELETE /api/reviews/:id (Delete Review)', () => {
    it('allows review owner to delete review (spec §6.5)', async () => {
      const existingReview = {
        id: 1,
        providerId,
        customerId, // Owner
      };

      vi.spyOn(db, 'select').mockImplementation(() => ({
        from: () => ({
          where: () => ({
            limit: () => Promise.resolve([existingReview]),
          }),
        }),
      }));

      let deleted = false;
      vi.spyOn(db, 'delete').mockImplementation(() => ({
        where: () => {
          deleted = true;
          return Promise.resolve();
        },
      }));

      const res = await request(app)
        .delete('/api/reviews/1')
        .set('Authorization', `Bearer ${customerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.message).toBe('Review deleted successfully');
      expect(deleted).toBe(true);
    });

    it('enforces ownership check: rejects non-owner delete with 403 (Exit Check)', async () => {
      const existingReview = {
        id: 1,
        providerId,
        customerId, // Owned by customerId
      };

      vi.spyOn(db, 'select').mockImplementation(() => ({
        from: () => ({
          where: () => ({
            limit: () => Promise.resolve([existingReview]),
          }),
        }),
      }));

      const res = await request(app)
        .delete('/api/reviews/1')
        .set('Authorization', `Bearer ${otherCustomerToken}`);

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });
  });

  describe('POST /api/reviews/:id/report (Report Review)', () => {
    it('allows customer to report a review with reason (spec §6.5)', async () => {
      vi.spyOn(db, 'select').mockImplementation(() => ({
        from: () => ({
          where: () => ({
            limit: () => Promise.resolve([{ id: 1 }]),
          }),
        }),
      }));

      let reported = false;
      vi.spyOn(db, 'insert').mockImplementation(() => ({
        values: () => {
          reported = true;
          return Promise.resolve();
        },
      }));

      const res = await request(app)
        .post('/api/reviews/1/report')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({ reason: 'Spam or offensive language in review' });

      expect(res.status).toBe(201);
      expect(res.body.data.message).toBe('Review reported successfully');
      expect(reported).toBe(true);
    });

    it('enforces one report per customer per review returning 409', async () => {
      vi.spyOn(db, 'select').mockImplementation(() => ({
        from: () => ({
          where: () => ({
            limit: () => Promise.resolve([{ id: 1 }]),
          }),
        }),
      }));

      vi.spyOn(db, 'insert').mockImplementation(() => ({
        values: () => {
          const err = new Error('duplicate key error');
          err.code = '23505';
          return Promise.reject(err);
        },
      }));

      const res = await request(app)
        .post('/api/reviews/1/report')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({ reason: 'Duplicate report attempt' });

      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe('DUPLICATE_REPORT');
    });
  });
});
