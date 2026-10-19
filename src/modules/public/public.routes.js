import { Router } from 'express';
import { PublicService } from './public.service.js';
import { providerDirectoryQuerySchema } from './public.schemas.js';
import { validate } from '../../middleware/validate.js';

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

// 2. Locations (Cities with nested Sub-cities)
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
publicRouter.get('/providers/:id', async (req, res, next) => {
  try {
    const providerId = Number(req.params.id);
    const provider = await PublicService.getProviderById(providerId);
    res.status(200).json({ data: provider });
  } catch (err) {
    next(err);
  }
});
