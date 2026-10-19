import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import { app } from '../../src/app.js';
import { env } from '../../src/config/env.js';
import { AuthService } from '../../src/modules/auth/auth.service.js';
import { createRateLimiter } from '../../src/middleware/rateLimit.js';

describe('CSRF Protection & Rate Limiting Hardening (spec §4.1, §5)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  const validOrigin = env.CORS_ORIGINS.split(',')[0].trim();

  describe('CSRF Protection on /api/auth/refresh and /api/auth/logout (spec §4.1)', () => {
    it('rejects POST /api/auth/refresh if X-Requested-With header is missing with 403', async () => {
      const res = await request(app)
        .post('/api/auth/refresh')
        .set('Origin', validOrigin);

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('CSRF_ERROR');
      expect(res.body.error.message).toContain('X-Requested-With');
    });

    it('rejects POST /api/auth/refresh if Origin header is missing with 403', async () => {
      const res = await request(app)
        .post('/api/auth/refresh')
        .set('X-Requested-With', 'XMLHttpRequest');

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('CSRF_ERROR');
      expect(res.body.error.message).toContain('Origin');
    });

    it('rejects POST /api/auth/refresh from an unauthorized Origin with 403', async () => {
      const res = await request(app)
        .post('/api/auth/refresh')
        .set('Origin', 'https://malicious-attacker-site.com')
        .set('X-Requested-With', 'XMLHttpRequest');

      expect(res.status).toBe(403);
      expect(['CSRF_ERROR', 'CORS_ERROR']).toContain(res.body.error.code);
    });

    it('rejects POST /api/auth/logout without CSRF headers with 403', async () => {
      const res = await request(app).post('/api/auth/logout');

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('CSRF_ERROR');
    });

    it('allows POST /api/auth/logout when Origin and X-Requested-With are valid', async () => {
      vi.spyOn(AuthService, 'logout').mockResolvedValue();

      const res = await request(app)
        .post('/api/auth/logout')
        .set('Origin', validOrigin)
        .set('X-Requested-With', 'XMLHttpRequest')
        .set('Cookie', ['refreshToken=valid_logout_token']);

      expect(res.status).toBe(200);
      expect(res.body.data.message).toBe('Logged out successfully');
    });
  });

  describe('Rate Limiting & Account Existence Protection (spec §5)', () => {
    it('rate limiting returns 429 without leaking whether account exists (Exit Check)', async () => {
      // Test isolated express app with a strict rate limiter (max 2 requests)
      const testApp = express();
      testApp.use(express.json());

      const testLimiter = createRateLimiter({
        windowMs: 60 * 1000,
        max: 2,
        enforceInTest: true,
        keyGenerator: (req) => {
          const identifier = req.body?.phone || req.body?.email || 'unknown';
          return `${req.ip}_${identifier.toString().toLowerCase().trim()}`;
        },
      });

      testApp.post('/test/login', testLimiter, (req, res) => {
        // Dummy handler mimicking auth check
        res.status(401).json({ error: { code: 'INVALID_CREDENTIALS', message: 'Invalid credentials' } });
      });

      // 1. Exceed rate limit for existing user identifier
      const existingIdentifier = '+251911000001';
      await request(testApp).post('/test/login').send({ phone: existingIdentifier });
      await request(testApp).post('/test/login').send({ phone: existingIdentifier });
      const rateLimitedExisting = await request(testApp)
        .post('/test/login')
        .send({ phone: existingIdentifier });

      // 2. Exceed rate limit for non-existent user identifier
      const nonExistentIdentifier = '+251999999999';
      await request(testApp).post('/test/login').send({ phone: nonExistentIdentifier });
      await request(testApp).post('/test/login').send({ phone: nonExistentIdentifier });
      const rateLimitedNonExistent = await request(testApp)
        .post('/test/login')
        .send({ phone: nonExistentIdentifier });

      // Both must return 429 with identical response shapes without leaking account existence
      expect(rateLimitedExisting.status).toBe(429);
      expect(rateLimitedNonExistent.status).toBe(429);
      expect(rateLimitedExisting.body).toEqual({
        error: {
          code: 'TOO_MANY_REQUESTS',
          message: 'Too many requests, please try again later',
        },
      });
      expect(rateLimitedNonExistent.body).toEqual(rateLimitedExisting.body);
    });
  });
});
