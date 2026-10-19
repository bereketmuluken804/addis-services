import { Router } from 'express';
import { ProviderService } from './provider.service.js';
import { updateProfileSchema, updateAvailabilitySchema } from './provider.schemas.js';
import { validate } from '../../middleware/validate.js';
import { authenticate } from '../../middleware/auth.js';
import { requireRole } from '../../middleware/requireRole.js';
import { uploadIdDocument } from '../../middleware/upload.js';

export const providerRouter = Router();

// Guarded for authenticated providers
providerRouter.use(authenticate, requireRole('PROVIDER'));

// 1. Get My Profile
providerRouter.get('/me', async (req, res, next) => {
  try {
    const profile = await ProviderService.getProfile(req.user.id);
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
  uploadIdDocument,
  async (req, res, next) => {
    try {
      const result = await ProviderService.resubmitDocument(req.user.id, req.file);
      res.status(201).json({ data: result });
    } catch (err) {
      next(err);
    }
  }
);
