import { Router } from 'express';
import { AdminService } from './admin.service.js';
import {
  verificationTransitionSchema,
  activationSchema,
  paginationQuerySchema,
  resetPasswordSchema,
  moderateReviewSchema,
  adminPhoneChangeQuerySchema,
  decidePhoneChangeSchema,
} from './admin.schemas.js';
import { validate } from '../../middleware/validate.js';
import { authenticate } from '../../middleware/auth.js';
import { requireRole } from '../../middleware/requireRole.js';
import { adminMutationsRateLimiter } from '../../middleware/rateLimit.js';

export const adminRouter = Router();

// Centralized Admin role guard for all /api/admin routes
adminRouter.use(authenticate, requireRole('ADMIN'));

// 1. Get Pending Providers List
adminRouter.get(
  '/providers/pending',
  validate({ query: paginationQuerySchema }),
  async (req, res, next) => {
    try {
      const result = await AdminService.getPendingProviders(req.query);
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  }
);

// 2. Get Signed URL for Provider Verification Document
adminRouter.get(
  '/providers/:id/verification-document',
  async (req, res, next) => {
    try {
      const providerId = Number(req.params.id);
      const result = await AdminService.getDocumentSignedUrl({
        providerId,
        adminId: req.user.id,
        reason: req.query.reason,
      });
      res.status(200).json({ data: result });
    } catch (err) {
      next(err);
    }
  }
);

// 3. Verification Transitions
adminRouter.patch(
  '/providers/:id/verification',
  validate({ body: verificationTransitionSchema }),
  async (req, res, next) => {
    try {
      const providerId = Number(req.params.id);
      const updatedProvider = await AdminService.transitionVerification({
        providerId,
        targetStatus: req.body.status,
        rejectionReason: req.body.rejectionReason,
        adminId: req.user.id,
      });
      res.status(200).json({
        data: {
          id: updatedProvider.id,
          verificationStatus: updatedProvider.verificationStatus,
          isActive: updatedProvider.isActive,
          verificationRejectionReason: updatedProvider.verificationRejectionReason,
        },
      });
    } catch (err) {
      next(err);
    }
  }
);

// 4. Activation & Suspension
adminRouter.patch(
  '/providers/:id/activation',
  validate({ body: activationSchema }),
  async (req, res, next) => {
    try {
      const providerId = Number(req.params.id);
      const updatedProvider = await AdminService.updateActivation({
        providerId,
        isActive: req.body.isActive,
        reason: req.body.reason,
        adminId: req.user.id,
      });
      res.status(200).json({
        data: {
          id: updatedProvider.id,
          verificationStatus: updatedProvider.verificationStatus,
          isActive: updatedProvider.isActive,
          suspensionReason: updatedProvider.suspensionReason,
        },
      });
    } catch (err) {
      next(err);
    }
  }
);

// 5. Admin Dashboard Statistics
adminRouter.get('/stats', async (req, res, next) => {
  try {
    const stats = await AdminService.getStats();
    res.status(200).json({ data: stats });
  } catch (err) {
    next(err);
  }
});

// 6. Admin-assisted Provider Password Reset (spec §4.4)
adminRouter.post(
  '/providers/:id/reset-password',
  adminMutationsRateLimiter,
  validate({ body: resetPasswordSchema }),
  async (req, res, next) => {
    try {
      const providerId = Number(req.params.id);
      const result = await AdminService.resetProviderPassword({
        providerId,
        reason: req.body?.reason,
        adminId: req.user.id,
      });
      res.status(200).json({ data: result });
    } catch (err) {
      next(err);
    }
  }
);

// 7. Moderate Review (spec §6.6)
adminRouter.patch(
  '/reviews/:id',
  adminMutationsRateLimiter,
  validate({ body: moderateReviewSchema }),
  async (req, res, next) => {
    try {
      const reviewId = Number(req.params.id);
      const updated = await AdminService.moderateReview({
        reviewId,
        status: req.body.status,
        reason: req.body.reason,
        adminId: req.user.id,
      });
      res.status(200).json({ data: updated });
    } catch (err) {
      next(err);
    }
  }
);

// 8. List Phone Change Requests (spec §6.6)
adminRouter.get(
  '/phone-change-requests',
  validate({ query: adminPhoneChangeQuerySchema }),
  async (req, res, next) => {
    try {
      const result = await AdminService.getPhoneChangeRequests({
        page: req.query.page,
        limit: req.query.limit,
        status: req.query.status,
      });
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  }
);

// 9. Decide Phone Change Request (spec §4.5, §6.6)
adminRouter.patch(
  '/phone-change-requests/:id',
  adminMutationsRateLimiter,
  validate({ body: decidePhoneChangeSchema }),
  async (req, res, next) => {
    try {
      const requestId = Number(req.params.id);
      const updated = await AdminService.decidePhoneChangeRequest({
        requestId,
        status: req.body.status,
        rejectionReason: req.body.rejectionReason,
        adminId: req.user.id,
      });
      res.status(200).json({ data: updated });
    } catch (err) {
      next(err);
    }
  }
);
