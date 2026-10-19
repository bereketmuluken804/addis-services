import { describe, it, expect, vi } from 'vitest';
import { z } from 'zod';
import { errorHandler, AppError } from '../../src/middleware/errorHandler.js';

describe('Error Handler Middleware (src/middleware/errorHandler.js)', () => {
  function createMockRes() {
    const res = {
      statusCode: null,
      body: null,
      status(code) {
        this.statusCode = code;
        return this;
      },
      json(data) {
        this.body = data;
        return this;
      },
      headersSent: false,
    };
    return res;
  }

  it('formats AppError with correct status, code, and message', () => {
    const err = new AppError(404, 'NOT_FOUND', 'Entity not found');
    const req = { headers: {} };
    const res = createMockRes();
    const next = vi.fn();

    errorHandler(err, req, res, next);

    expect(res.statusCode).toBe(404);
    expect(res.body).toEqual({
      error: {
        code: 'NOT_FOUND',
        message: 'Entity not found',
      },
    });
  });

  it('formats ZodError as 400 VALIDATION_ERROR', () => {
    const schema = z.object({ phone: z.string().min(5, 'Phone too short') });
    let zodError;
    try {
      schema.parse({ phone: '12' });
    } catch (e) {
      zodError = e;
    }

    const req = { headers: {} };
    const res = createMockRes();
    const next = vi.fn();

    errorHandler(zodError, req, res, next);

    expect(res.statusCode).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(res.body.error.message).toContain('Phone too short');
  });

  it('hides internal error details on unexpected 500 errors', () => {
    const internalErr = new Error('FATAL: password authentication failed for user "postgres"');
    const req = { headers: {} };
    const res = createMockRes();
    const next = vi.fn();

    errorHandler(internalErr, req, res, next);

    expect(res.statusCode).toBe(500);
    expect(res.body).toEqual({
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'An unexpected internal error occurred',
      },
    });
    // Ensure database connection strings / internal details are never leaked
    expect(JSON.stringify(res.body)).not.toContain('postgres');
    expect(JSON.stringify(res.body)).not.toContain('authentication failed');
  });
});
