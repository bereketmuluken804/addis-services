import { ZodError } from 'zod';
import { logger } from './logger.js';

export class AppError extends Error {
  constructor(statusCode, code, message) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.code = code;
  }
}

export function errorHandler(err, req, res, next) {
  // If response has already started streaming, delegate to default Express handler
  if (res.headersSent) {
    return next(err);
  }

  // 1. Handled AppError
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      error: {
        code: err.code,
        message: err.message,
      },
    });
  }

  // 2. Zod Validation Error
  if (err instanceof ZodError) {
    const message = err.errors.map((e) => e.message).join('; ');
    return res.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: message || 'Validation failed',
      },
    });
  }

  // 3. JSON Syntax Error from body-parser
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    return res.status(400).json({
      error: {
        code: 'BAD_REQUEST',
        message: 'Malformed JSON payload',
      },
    });
  }

  // 4. Multer errors
  if (err.name === 'MulterError') {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({
        error: {
          code: 'PAYLOAD_TOO_LARGE',
          message: 'File size exceeds maximum permitted limit',
        },
      });
    }
    return res.status(400).json({
      error: {
        code: 'UPLOAD_ERROR',
        message: err.message,
      },
    });
  }

  // 5. Unhandled / Internal Server Error
  // Log the full error with stack internally, but never expose to client
  logger.error(
    {
      err,
      requestId: req.id || req.headers['x-request-id'],
      method: req.method,
      url: req.originalUrl,
    },
    'Unhandled server error'
  );

  return res.status(500).json({
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message: 'An unexpected internal error occurred',
    },
  });
}
