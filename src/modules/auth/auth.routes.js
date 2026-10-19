import { Router } from 'express';
import { AuthService } from './auth.service.js';
import {
  providerRegisterSchema,
  customerRegisterSchema,
  phoneLoginSchema,
} from './auth.schemas.js';
import { validate } from '../../middleware/validate.js';
import { uploadIdDocument } from '../../middleware/upload.js';
import {
  registrationRateLimiter,
  loginRateLimiter,
  refreshRateLimiter,
} from '../../middleware/rateLimit.js';
import {
  parseCookies,
  setRefreshTokenCookie,
  clearRefreshTokenCookie,
} from '../../lib/cookies.js';

export const authRouter = Router();

// Helper to extract refresh token from cookie or header
function getRefreshToken(req) {
  const cookies = parseCookies(req.headers.cookie);
  return cookies.refreshToken || req.headers['x-refresh-token'];
}

// 1. Provider Registration (multipart/form-data)
authRouter.post(
  '/provider/register',
  registrationRateLimiter,
  uploadIdDocument,
  validate({ body: providerRegisterSchema }),
  async (req, res, next) => {
    try {
      const result = await AuthService.registerProvider(req.body, req.file);
      setRefreshTokenCookie(res, result.tokens.refreshToken);
      res.status(201).json({
        data: {
          provider: result.provider,
          accessToken: result.tokens.accessToken,
        },
      });
    } catch (err) {
      next(err);
    }
  }
);

// 2. Provider Login
authRouter.post(
  '/provider/login',
  loginRateLimiter,
  validate({ body: phoneLoginSchema }),
  async (req, res, next) => {
    try {
      const result = await AuthService.loginProvider(req.body);
      setRefreshTokenCookie(res, result.tokens.refreshToken);
      res.status(200).json({
        data: {
          provider: result.provider,
          accessToken: result.tokens.accessToken,
        },
      });
    } catch (err) {
      next(err);
    }
  }
);

// 3. Customer Registration
authRouter.post(
  '/customer/register',
  registrationRateLimiter,
  validate({ body: customerRegisterSchema }),
  async (req, res, next) => {
    try {
      const result = await AuthService.registerCustomer(req.body);
      setRefreshTokenCookie(res, result.tokens.refreshToken);
      res.status(201).json({
        data: {
          customer: result.customer,
          accessToken: result.tokens.accessToken,
        },
      });
    } catch (err) {
      next(err);
    }
  }
);

// 4. Customer Login
authRouter.post(
  '/customer/login',
  loginRateLimiter,
  validate({ body: phoneLoginSchema }),
  async (req, res, next) => {
    try {
      const result = await AuthService.loginCustomer(req.body);
      setRefreshTokenCookie(res, result.tokens.refreshToken);
      res.status(200).json({
        data: {
          customer: result.customer,
          accessToken: result.tokens.accessToken,
        },
      });
    } catch (err) {
      next(err);
    }
  }
);

// 5. Token Refresh
authRouter.post('/refresh', refreshRateLimiter, async (req, res, next) => {
  try {
    const rawRefreshToken = getRefreshToken(req);
    const result = await AuthService.refreshTokens(rawRefreshToken);
    setRefreshTokenCookie(res, result.refreshToken);
    res.status(200).json({
      data: {
        accessToken: result.accessToken,
      },
    });
  } catch (err) {
    next(err);
  }
});

// 6. Logout
authRouter.post('/logout', async (req, res, next) => {
  try {
    const rawRefreshToken = getRefreshToken(req);
    await AuthService.logout(rawRefreshToken);
    clearRefreshTokenCookie(res);
    res.status(200).json({
      data: {
        message: 'Logged out successfully',
      },
    });
  } catch (err) {
    next(err);
  }
});
