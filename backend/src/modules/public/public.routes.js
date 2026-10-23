import { Router } from 'express';
import { PublicService } from './public.service.js';
import {
  providerDirectoryQuerySchema,
  paginationQuerySchema,
  providerIdParamSchema,
} from './public.schemas.js';
import { validate } from '../../middleware/validate.js';
import { optionalAuthenticate } from '../../middleware/auth.js';
import { getStorage } from '../../lib/storage/index.js';

export const publicRouter = Router();

// 1. Categories
publicRouter.get('/categories', async (req, res, next) => {
  try {
    const categories = await PublicService.getCategories();
    res.status(200).json({ data: categories });
  } catch (err) {
    next(err);
  }
});

// 2. Locations (Cities with nested sub-cities)
publicRouter.get('/locations', async (req, res, next) => {
  try {
    const locations = await PublicService.getLocations();
    res.status(200).json({ data: locations });
  } catch (err) {
    next(err);
  }
});

// 3. Provider Directory
publicRouter.get(
  '/providers',
  validate({ query: providerDirectoryQuerySchema }),
  async (req, res, next) => {
    try {
      const result = await PublicService.getProviders(req.query);
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  }
);

// 4. Provider Detail
publicRouter.get(
  '/providers/:id',
  validate({ params: providerIdParamSchema }),
  async (req, res, next) => {
    try {
      const providerId = req.params.id;
      const provider = await PublicService.getProviderById(providerId);
      res.status(200).json({ data: provider });
    } catch (err) {
      next(err);
    }
  }
);

// 5. Provider Public Reviews (spec §6.3)
publicRouter.get(
  '/providers/:id/reviews',
  optionalAuthenticate,
  validate({ params: providerIdParamSchema, query: paginationQuerySchema }),
  async (req, res, next) => {
    try {
      const providerId = req.params.id;
      const result = await PublicService.getProviderReviews({
        providerId,
        page: req.query.page,
        limit: req.query.limit,
        currentUserId: req.user?.role === 'CUSTOMER' ? req.user.id : null,
      });
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  }
);

// 6. Public Avatars
publicRouter.get(['/avatars/:filename', '/public/avatars/:filename'], async (req, res, next) => {
  try {
    const key = `avatars/${req.params.filename}`;
    const storage = getStorage();
    const obj = await storage.getObject(key);
    res.setHeader('Content-Type', obj.contentType || 'image/jpeg');
    res.setHeader('Cache-Control', 'public, max-age=86400');
    if (obj.stream) {
      obj.stream.pipe(res);
    } else {
      res.send(obj.buffer);
    }
  } catch (err) {
    res.status(404).send('Not found');
  }
});
