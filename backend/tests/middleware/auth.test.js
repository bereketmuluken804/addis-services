import { describe, it, expect, vi } from 'vitest';
import jwt from 'jsonwebtoken';
import { authenticate } from '../../src/middleware/auth.js';
import { requireRole } from '../../src/middleware/requireRole.js';
import { signAccessToken } from '../../src/lib/tokens.js';
import { env } from '../../src/config/env.js';

describe('Auth Middleware (src/middleware/auth.js & requireRole.js)', () => {
  describe('authenticate', () => {
    it('rejects requests without authorization header with 401 UNAUTHORIZED', () => {
      const req = { headers: {} };
      const res = {};
      const next = vi.fn();

      authenticate(req, res, next);

      expect(next).toHaveBeenCalledTimes(1);
      const error = next.mock.calls[0][0];
      expect(error.statusCode).toBe(401);
      expect(error.code).toBe('UNAUTHORIZED');
    });

    it('rejects requests with non-Bearer authorization header with 401 UNAUTHORIZED', () => {
      const req = { headers: { authorization: 'Basic 123456' } };
      const res = {};
      const next = vi.fn();

      authenticate(req, res, next);

      expect(next).toHaveBeenCalledTimes(1);
      const error = next.mock.calls[0][0];
      expect(error.statusCode).toBe(401);
      expect(error.code).toBe('UNAUTHORIZED');
    });

    it('authenticates valid access token and attaches user to request', () => {
      const validToken = signAccessToken({ sub: 42, role: 'PROVIDER' });
      const req = { headers: { authorization: `Bearer ${validToken}` } };
      const res = {};
      const next = vi.fn();

      authenticate(req, res, next);

      expect(next).toHaveBeenCalledWith();
      expect(req.user).toEqual({ id: 42, role: 'PROVIDER' });
    });

    it('rejects expired JWT with 401 TOKEN_EXPIRED', () => {
      const expiredToken = jwt.sign(
        { sub: '42', role: 'PROVIDER' },
        env.JWT_SECRET,
        {
          algorithm: 'HS256',
          issuer: env.JWT_ISSUER,
          audience: env.JWT_AUDIENCE,
          expiresIn: '-10s',
        }
      );
      const req = { headers: { authorization: `Bearer ${expiredToken}` } };
      const res = {};
      const next = vi.fn();

      authenticate(req, res, next);

      const error = next.mock.calls[0][0];
      expect(error.statusCode).toBe(401);
      expect(error.code).toBe('TOKEN_EXPIRED');
    });

    it('rejects wrong-audience JWT with 401 INVALID_TOKEN', () => {
      const wrongAudToken = jwt.sign(
        { sub: '42', role: 'ADMIN' },
        env.JWT_SECRET,
        {
          algorithm: 'HS256',
          issuer: env.JWT_ISSUER,
          audience: 'wrong-audience',
          expiresIn: '15m',
        }
      );
      const req = { headers: { authorization: `Bearer ${wrongAudToken}` } };
      const res = {};
      const next = vi.fn();

      authenticate(req, res, next);

      const error = next.mock.calls[0][0];
      expect(error.statusCode).toBe(401);
      expect(error.code).toBe('INVALID_TOKEN');
    });

    it('rejects wrong-issuer JWT with 401 INVALID_TOKEN', () => {
      const wrongIssToken = jwt.sign(
        { sub: '42', role: 'ADMIN' },
        env.JWT_SECRET,
        {
          algorithm: 'HS256',
          issuer: 'rogue-issuer',
          audience: env.JWT_AUDIENCE,
          expiresIn: '15m',
        }
      );
      const req = { headers: { authorization: `Bearer ${wrongIssToken}` } };
      const res = {};
      const next = vi.fn();

      authenticate(req, res, next);

      const error = next.mock.calls[0][0];
      expect(error.statusCode).toBe(401);
      expect(error.code).toBe('INVALID_TOKEN');
    });

    it('rejects alg-swapped JWT (algorithm none) with 401 INVALID_TOKEN', () => {
      // Craft an unsigned token with alg: none
      const header = Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString('base64url');
      const payload = Buffer.from(
        JSON.stringify({
          sub: '42',
          role: 'ADMIN',
          iss: env.JWT_ISSUER,
          aud: env.JWT_AUDIENCE,
        })
      ).toString('base64url');
      const noneToken = `${header}.${payload}.`;

      const req = { headers: { authorization: `Bearer ${noneToken}` } };
      const res = {};
      const next = vi.fn();

      authenticate(req, res, next);

      const error = next.mock.calls[0][0];
      expect(error.statusCode).toBe(401);
      expect(error.code).toBe('INVALID_TOKEN');
    });

    it('rejects token signed with wrong secret with 401 INVALID_TOKEN', () => {
      const forgedToken = jwt.sign(
        { sub: '42', role: 'ADMIN' },
        'different_secret_key_used_for_forgery_test_123',
        {
          algorithm: 'HS256',
          issuer: env.JWT_ISSUER,
          audience: env.JWT_AUDIENCE,
          expiresIn: '15m',
        }
      );
      const req = { headers: { authorization: `Bearer ${forgedToken}` } };
      const res = {};
      const next = vi.fn();

      authenticate(req, res, next);

      const error = next.mock.calls[0][0];
      expect(error.statusCode).toBe(401);
      expect(error.code).toBe('INVALID_TOKEN');
    });
  });

  describe('requireRole', () => {
    it('allows access when user has the required role', () => {
      const guard = requireRole('ADMIN');
      const req = { user: { id: 1, role: 'ADMIN' } };
      const res = {};
      const next = vi.fn();

      guard(req, res, next);

      expect(next).toHaveBeenCalledWith();
    });

    it('allows access when user matches one of multiple allowed roles', () => {
      const guard = requireRole('ADMIN', 'PROVIDER');
      const req = { user: { id: 2, role: 'PROVIDER' } };
      const res = {};
      const next = vi.fn();

      guard(req, res, next);

      expect(next).toHaveBeenCalledWith();
    });

    it('returns 403 FORBIDDEN when user has a different role', () => {
      const guard = requireRole('ADMIN');
      const req = { user: { id: 2, role: 'CUSTOMER' } };
      const res = {};
      const next = vi.fn();

      guard(req, res, next);

      expect(next).toHaveBeenCalledTimes(1);
      const error = next.mock.calls[0][0];
      expect(error.statusCode).toBe(403);
      expect(error.code).toBe('FORBIDDEN');
    });

    it('returns 401 UNAUTHORIZED when req.user is missing', () => {
      const guard = requireRole('ADMIN');
      const req = {};
      const res = {};
      const next = vi.fn();

      guard(req, res, next);

      const error = next.mock.calls[0][0];
      expect(error.statusCode).toBe(401);
      expect(error.code).toBe('UNAUTHORIZED');
    });
  });
});
