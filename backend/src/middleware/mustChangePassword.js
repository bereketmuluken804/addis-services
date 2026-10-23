import { eq } from 'drizzle-orm';
import { db } from '../db/client.js';
import * as schema from '../db/schema.js';
import { AppError } from './errorHandler.js';

export async function enforceMustChangePassword(req, res, next) {
  try {
    if (!req.user || req.user.role !== 'PROVIDER') {
      return next();
    }

    const [provider] = await db
      .select()
      .from(schema.providers)
      .where(eq(schema.providers.id, req.user.id))
      .limit(1);

    if (!provider) {
      return next(new AppError(404, 'NOT_FOUND', 'Provider not found'));
    }

    req.provider = provider;

    if (provider.mustChangePassword) {
      // Allow only PATCH /me/password for gated provider
      const isPasswordChange =
        req.method === 'PATCH' &&
        (req.path === '/me/password' || req.path === '/me/password/');

      if (!isPasswordChange) {
        return next(
          new AppError(
            403,
            'PASSWORD_CHANGE_REQUIRED',
            'Password change required before accessing other resources'
          )
        );
      }
    }

    next();
  } catch (err) {
    next(err);
  }
}
