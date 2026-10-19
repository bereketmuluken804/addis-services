import { AppError } from './errorHandler.js';
import { env } from '../config/env.js';

export function csrfProtection(req, res, next) {
  const origin = req.headers.origin;
  const requestedWith = req.headers['x-requested-with'];

  if (!requestedWith) {
    return next(new AppError(403, 'CSRF_ERROR', 'Missing required X-Requested-With header'));
  }

  if (!origin) {
    return next(new AppError(403, 'CSRF_ERROR', 'Missing required Origin header'));
  }

  const allowedOrigins = env.CORS_ORIGINS.split(',').map((o) => o.trim()).filter(Boolean);
  if (!allowedOrigins.includes(origin) && !allowedOrigins.includes('*')) {
    return next(new AppError(403, 'CSRF_ERROR', 'Forbidden origin'));
  }

  next();
}
