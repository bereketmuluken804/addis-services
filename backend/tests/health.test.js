import { describe, it, expect, vi } from 'vitest';
import request from 'supertest';
import { app } from '../src/app.js';
import { db } from '../src/db/client.js';

describe('System Health & App routing (/healthz & 404)', () => {
  it('returns 200 { status: "ok" } on GET /healthz when database is healthy', async () => {
    // Mock db.execute to simulate healthy database response
    vi.spyOn(db, 'execute').mockResolvedValueOnce([{ '?column?': 1 }]);

    const res = await request(app).get('/healthz');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 'ok' });
  });

  it('returns 503 SERVICE_UNAVAILABLE on GET /healthz when database check fails', async () => {
    vi.spyOn(db, 'execute').mockRejectedValueOnce(new Error('Connection timeout'));

    const res = await request(app).get('/healthz');

    expect(res.status).toBe(503);
    expect(res.body).toEqual({
      error: {
        code: 'SERVICE_UNAVAILABLE',
        message: 'Database connectivity check failed',
      },
    });
  });

  it('returns 404 NOT_FOUND on unknown route with standard error shape', async () => {
    const res = await request(app).get('/api/unknown-non-existent-endpoint');

    expect(res.status).toBe(404);
    expect(res.body).toEqual({
      error: {
        code: 'NOT_FOUND',
        message: 'Route GET /api/unknown-non-existent-endpoint not found',
      },
    });
  });
});
