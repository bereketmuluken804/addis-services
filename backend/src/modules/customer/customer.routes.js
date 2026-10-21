import { Router } from 'express';
import { CustomerService } from './customer.service.js';
import {
  createReviewSchema,
  updateReviewSchema,
  reportReviewSchema,
} from './customer.schemas.js';
import { validate } from '../../middleware/validate.js';
import { authenticate } from '../../middleware/auth.js';
import { requireRole } from '../../middleware/requireRole.js';

export const customerRouter = Router();

const requireCustomer = [authenticate, requireRole('CUSTOMER')];

// 1. Create Review for Eligible Provider (spec §6.5)
customerRouter.post(
  '/providers/:id/reviews',
  ...requireCustomer,
  validate({ body: createReviewSchema }),
  async (req, res, next) => {
    try {
      const providerId = Number(req.params.id);
      const review = await CustomerService.createReview({
        providerId,
        customerId: req.user.id,
        rating: req.body.rating,
        comment: req.body.comment,
      });
      res.status(201).json({ data: review });
    } catch (err) {
      next(err);
    }
  }
);

// 2. Edit Review (Owner only) (spec §6.5)
customerRouter.patch(
  '/reviews/:id',
  ...requireCustomer,
  validate({ body: updateReviewSchema }),
  async (req, res, next) => {
    try {
      const reviewId = Number(req.params.id);
      const updated = await CustomerService.updateReview({
        reviewId,
        customerId: req.user.id,
        rating: req.body.rating,
        comment: req.body.comment,
      });
      res.status(200).json({ data: updated });
    } catch (err) {
      next(err);
    }
  }
);

// 3. Delete Review (Owner only) (spec §6.5)
customerRouter.delete(
  '/reviews/:id',
  ...requireCustomer,
  async (req, res, next) => {
    try {
      const reviewId = Number(req.params.id);
      const result = await CustomerService.deleteReview({
        reviewId,
        customerId: req.user.id,
      });
      res.status(200).json({ data: result });
    } catch (err) {
      next(err);
    }
  }
);

// 4. Report Review (spec §6.5)
customerRouter.post(
  '/reviews/:id/report',
  ...requireCustomer,
  validate({ body: reportReviewSchema }),
  async (req, res, next) => {
    try {
      const reviewId = Number(req.params.id);
      const result = await CustomerService.reportReview({
        reviewId,
        customerId: req.user.id,
        reason: req.body.reason,
      });
      res.status(201).json({ data: result });
    } catch (err) {
      next(err);
    }
  }
);
