import rateLimit from 'express-rate-limit';
import { env } from '../config/env.js';

export function createRateLimiter({ windowMs, max, keyGenerator, enforceInTest = false }) {
  return rateLimit({
    windowMs,
    max: !enforceInTest && env.NODE_ENV === 'test' ? 10000 : max,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => {
      if (keyGenerator) return keyGenerator(req);
      return req.ip;
    },
    handler: (req, res) => {
      res.status(429).json({
        error: {
          code: 'TOO_MANY_REQUESTS',
          message: 'Too many requests, please try again later',
        },
      });
    },
  });
}

// 1. Registration rate limiter: 5 / hour per IP
export const registrationRateLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000,
  max: 5,
  keyGenerator: (req) => req.ip,
});

// 2. Login rate limiter: 5 / 15 min per IP + identifier (phone or email)
export const loginRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 5,
  keyGenerator: (req) => {
    const identifier = req.body?.phone || req.body?.email || 'unknown';
    return `${req.ip}_${identifier.toString().toLowerCase().trim()}`;
  },
});

// 3. Refresh token rate limiter: 20 / 15 min per IP + token hash
export const refreshRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 20,
  keyGenerator: (req) => {
    const rawToken = req.cookies?.refreshToken || req.headers['x-refresh-token'] || '';
    return `${req.ip}_${rawToken.slice(0, 16)}`;
  },
});

// 4. Call-click rate limiter: 30 / min per IP (spec §5)
export const callClickRateLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  max: 30,
  keyGenerator: (req) => req.ip,
});

// 5. Admin mutations and resets rate limiter: 10 / min per admin + IP (spec §5)
export const adminMutationsRateLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  max: 10,
  keyGenerator: (req) => {
    const adminId = req.user?.id || 'anonymous';
    return `${req.ip}_${adminId}`;
  },
});

// 6. Document upload and resubmission rate limiter: 5 / hour per provider + IP (spec §5)
export const documentUploadRateLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000,
  max: 5,
  keyGenerator: (req) => {
    const providerId = req.user?.id || 'anonymous';
    return `${req.ip}_${providerId}`;
  },
});

// 7. Phone-change request rate limiter: 3 / hour per provider + IP (spec §5)
export const phoneChangeRateLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000,
  max: 3,
  keyGenerator: (req) => {
    const providerId = req.user?.id || 'anonymous';
    return `${req.ip}_${providerId}`;
  },
});

// 8. Password change rate limiter: 5 / 15 min per provider + IP
export const passwordChangeRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 5,
  keyGenerator: (req) => {
    const providerId = req.user?.id || 'anonymous';
    return `${req.ip}_${providerId}`;
  },
});

