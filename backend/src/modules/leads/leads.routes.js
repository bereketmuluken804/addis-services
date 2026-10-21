import { Router } from 'express';
import { LeadsService } from './leads.service.js';
import { callClickSchema } from './leads.schemas.js';
import { validate } from '../../middleware/validate.js';
import { callClickRateLimiter } from '../../middleware/rateLimit.js';

export const leadsRouter = Router();

// POST /api/leads/call (public with rate limit and dedup)
leadsRouter.post(
  '/call',
  callClickRateLimiter,
  validate({ body: callClickSchema }),
  async (req, res, next) => {
    try {
      const result = await LeadsService.recordCallClick({
        providerId: req.body.providerId,
        clientIp: req.ip,
      });
      res.status(200).json({ data: result });
    } catch (err) {
      next(err);
    }
  }
);
