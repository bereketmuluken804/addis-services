import { Router } from 'express';
import { ProviderService } from './provider.service.js';
import {
  updateProfileSchema,
  updateAvailabilitySchema,
  changePasswordSchema,
} from './provider.schemas.js';
import { validate } from '../../middleware/validate.js';
import { authenticate } from '../../middleware/auth.js';
import { requireRole } from '../../middleware/requireRole.js';
import { uploadIdDocument } from '../../middleware/upload.js';
import { enforceMustChangePassword } from '../../middleware/mustChangePassword.js';
import {
  documentUploadRateLimiter,
  passwordChangeRateLimiter,
} from '../../middleware/rateLimit.js';
import { setRefreshTokenCookie } from '../../lib/cookies.js';

export const providerRouter = Router();

// Guarded for authenticated providers + enforce mustChangePassword gate
providerRouter.use(authenticate, requireRole('PROVIDER'), enforceMustChangePassword);

// 1. Get My Profile
providerRouter.get('/me', async (req, res, next) => {
  try {
    const profile = await ProviderService.getProfile(req.user.id, req.provider);
    res.status(200).json({ data: profile });
  } catch (err) {
    next(err);
  }
});

// 2. Patch My Profile
providerRouter.patch(
  '/me',
  validate({ body: updateProfileSchema }),
  async (req, res, next) => {
    try {
      const updated = await ProviderService.updateProfile(req.user.id, req.body);
      res.status(200).json({ data: updated });
    } catch (err) {
      next(err);
    }
  }
);

// 3. Patch Availability Badge
providerRouter.patch(
  '/me/availability',
  validate({ body: updateAvailabilitySchema }),
  async (req, res, next) => {
    try {
      const result = await ProviderService.updateAvailability(req.user.id, req.body.isAvailable);
      res.status(200).json({ data: result });
    } catch (err) {
      next(err);
    }
  }
);

// 4. Resubmit Verification Document
providerRouter.post(
  '/me/verification-document',
  documentUploadRateLimiter,
  uploadIdDocument,
  async (req, res, next) => {
    try {
      const result = await ProviderService.resubmitDocument(req.user.id, req.file, req.provider);
      res.status(201).json({ data: result });
    } catch (err) {
      next(err);
    }
  }
);

// 5. Change Password (spec §6.4)
providerRouter.patch(
  '/me/password',
  passwordChangeRateLimiter,
  validate({ body: changePasswordSchema }),
  async (req, res, next) => {
    try {
      const result = await ProviderService.changePassword(req.user.id, req.body);
      setRefreshTokenCookie(res, result.refreshToken);
      res.status(200).json({
        data: {
          accessToken: result.accessToken,
        },
      });
    } catch (err) {
      next(err);
    }
  }
);
