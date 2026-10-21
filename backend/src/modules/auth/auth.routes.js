import { Router } from 'express';
import { AuthService } from './auth.service.js';
import {
  providerRegisterSchema,
  customerRegisterSchema,
  phoneLoginSchema,
  adminLoginSchema,
} from './auth.schemas.js';
import { validate } from '../../middleware/validate.js';
import { uploadIdDocument } from '../../middleware/upload.js';
import {
  registrationRateLimiter,
  loginRateLimiter,
  refreshRateLimiter,
} from '../../middleware/rateLimit.js';
import { csrfProtection } from '../../middleware/csrf.js';
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

// 1. Provider Registration (multipart/form-data) — supports both /provider/register and /register/provider
authRouter.post(
  ['/provider/register', '/register/provider'],
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
  ['/provider/login', '/login/provider'],
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

// 3. Customer Registration — supports both /customer/register and /register/customer
authRouter.post(
  ['/customer/register', '/register/customer'],
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
  ['/customer/login', '/login/customer'],
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

// 5. Admin Login
authRouter.post(
  ['/admin/login', '/login/admin'],
  loginRateLimiter,
  validate({ body: adminLoginSchema }),
  async (req, res, next) => {
    try {
      const result = await AuthService.loginAdmin(req.body);
      setRefreshTokenCookie(res, result.tokens.refreshToken);
      res.status(200).json({
        data: {
          admin: result.admin,
          accessToken: result.tokens.accessToken,
        },
      });
    } catch (err) {
      next(err);
    }
  }
);

// 6. Unified Login Fallback (/api/auth/login)
authRouter.post(
  '/login',
  loginRateLimiter,
  async (req, res, next) => {
    try {
      if (req.body.email) {
        const validated = adminLoginSchema.parse(req.body);
        const result = await AuthService.loginAdmin(validated);
        setRefreshTokenCookie(res, result.tokens.refreshToken);
        return res.status(200).json({
          data: {
            admin: result.admin,
            user: { ...result.admin, role: 'ADMIN' },
            role: 'ADMIN',
            accessToken: result.tokens.accessToken,
          },
        });
      }

      const phone = req.body.phone || req.body.identifier;
      const validated = phoneLoginSchema.parse({ phone, password: req.body.password });

      // Try provider first, then customer
      try {
        const result = await AuthService.loginProvider(validated);
        setRefreshTokenCookie(res, result.tokens.refreshToken);
        return res.status(200).json({
          data: {
            provider: result.provider,
            user: { ...result.provider, role: 'PROVIDER' },
            role: 'PROVIDER',
            accessToken: result.tokens.accessToken,
          },
        });
      } catch (provErr) {
        if (provErr.status !== 401) throw provErr;
        const result = await AuthService.loginCustomer(validated);
        setRefreshTokenCookie(res, result.tokens.refreshToken);
        return res.status(200).json({
          data: {
            customer: result.customer,
            user: { ...result.customer, role: 'CUSTOMER' },
            role: 'CUSTOMER',
            accessToken: result.tokens.accessToken,
          },
        });
      }
    } catch (err) {
      next(err);
    }
  }
);

// 7. Token Refresh
authRouter.post('/refresh', csrfProtection, refreshRateLimiter, async (req, res, next) => {
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

// 8. Logout
authRouter.post('/logout', csrfProtection, async (req, res, next) => {
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
