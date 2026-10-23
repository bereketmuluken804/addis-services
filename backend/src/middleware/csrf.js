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
  let isAllowed = allowedOrigins.includes('*') || allowedOrigins.includes(origin);

  // Same-origin check: requests originating from the same host
  if (!isAllowed && req.headers?.host) {
    try {
      const parsed = new URL(origin);
      if (parsed.host === req.headers.host) {
        isAllowed = true;
      }
    } catch {}
  }

  // Render external URL check
  if (!isAllowed && process.env.RENDER_EXTERNAL_URL) {
    try {
      const renderHost = new URL(process.env.RENDER_EXTERNAL_URL).host;
      const parsed = new URL(origin);
      if (parsed.host === renderHost) {
        isAllowed = true;
      }
    } catch {}
  }

  if (!isAllowed) {
    return next(new AppError(403, 'CSRF_ERROR', 'Forbidden origin'));
  }

  next();
}
