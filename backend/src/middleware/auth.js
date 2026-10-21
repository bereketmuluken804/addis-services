import { verifyAccessToken } from '../lib/tokens.js';
import { AppError } from './errorHandler.js';

export function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next(new AppError(401, 'UNAUTHORIZED', 'Authentication token required'));
  }

  const token = authHeader.slice(7).trim();
  if (!token) {
    return next(new AppError(401, 'UNAUTHORIZED', 'Authentication token required'));
  }

  try {
    const payload = verifyAccessToken(token);
    req.user = {
      id: Number(payload.sub),
      role: payload.role,
    };
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return next(new AppError(401, 'TOKEN_EXPIRED', 'Token has expired'));
    }
    return next(new AppError(401, 'INVALID_TOKEN', 'Invalid or malformed authentication token'));
  }
}
