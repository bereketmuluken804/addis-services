import { Router } from 'express';
import { AdminService } from './admin.service.js';
import {
  verificationTransitionSchema,
  activationSchema,
  paginationQuerySchema,
} from './admin.schemas.js';
import { validate } from '../../middleware/validate.js';
import { authenticate } from '../../middleware/auth.js';
import { requireRole } from '../../middleware/requireRole.js';

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
