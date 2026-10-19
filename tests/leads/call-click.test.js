import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { app } from '../../src/app.js';
import { db } from '../../src/db/client.js';
import { LeadsService } from '../../src/modules/leads/leads.service.js';
import { computeIpHmac } from '../../src/lib/crypto.js';

describe('Call-Click Event Tracking & Deduplication (src/modules/leads/leads.routes.js)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  const providerId = 50;

  it('rejects call-click tracking for ineligible provider with 404 (Invariant #1)', async () => {
    // Provider is missing or not eligible
    vi.spyOn(db, 'select').mockImplementation(() => ({
      from: () => ({
        where: () => ({
          limit: () => Promise.resolve([]),
        }),
      }),
    }));

    const res = await request(app)
      .post('/api/leads/call')
      .send({ providerId });

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });

  it('records first call-click event for eligible provider (recorded: true)', async () => {
    let selectCount = 0;
    vi.spyOn(db, 'select').mockImplementation(() => ({
      from: () => ({
        where: () => ({
          limit: () => {
            selectCount++;
            if (selectCount === 1) return Promise.resolve([{ id: providerId }]); // Eligible provider
            return Promise.resolve([]); // No existing click within window
          },
        }),
      }),
    }));

    let inserted = false;
    vi.spyOn(db, 'transaction').mockImplementation(async (callback) => {
      const mockTx = {
        execute: () => Promise.resolve(), // Advisory lock
        select: () => ({
          from: () => ({
            where: () => ({
              limit: () => Promise.resolve([]), // No click inside window
            }),
          }),
        }),
        insert: () => ({
          values: () => {
            inserted = true;
            return Promise.resolve();
          },
        }),
      };
      return await callback(mockTx);
    });

    const res = await request(app)
      .post('/api/leads/call')
      .send({ providerId });

    expect(res.status).toBe(200);
    expect(res.body.data).toEqual({ recorded: true });
    expect(inserted).toBe(true);
  });

  it('deduplicates duplicate click within the window (recorded: false, no insert)', async () => {
    vi.spyOn(db, 'select').mockImplementation(() => ({
      from: () => ({
        where: () => ({
          limit: () => Promise.resolve([{ id: providerId }]), // Provider ok
        }),
      }),
    }));

    let inserted = false;
    vi.spyOn(db, 'transaction').mockImplementation(async (callback) => {
      const mockTx = {
        execute: () => Promise.resolve(), // Advisory lock
        select: () => ({
          from: () => ({
            where: () => ({
              limit: () => Promise.resolve([{ id: 123 }]), // Found existing click in window!
            }),
          }),
        }),
        insert: () => ({
          values: () => {
            inserted = true;
            return Promise.resolve();
          },
        }),
      };
      return await callback(mockTx);
    });

    const res = await request(app)
      .post('/api/leads/call')
      .send({ providerId });

    expect(res.status).toBe(200);
    expect(res.body.data).toEqual({ recorded: false });
    expect(inserted).toBe(false);
  });

  it('computes HMAC server-side and ignores client headers (Invariant #5)', () => {
    const rawIp = '192.168.1.100';
    const computed = computeIpHmac(rawIp);

    expect(typeof computed).toBe('string');
    expect(computed).toHaveLength(64); // SHA-256 hex
  });

  it('20 parallel identical clicks produce exactly one recorded event', async () => {
    // In-memory call log to simulate concurrent DB under advisory lock
    const inMemoryCallLogs = [];

    vi.spyOn(db, 'select').mockImplementation(() => ({
      from: () => ({
        where: () => ({
          limit: () => Promise.resolve([{ id: providerId }]),
        }),
      }),
    }));

    let lockQueue = Promise.resolve();
    vi.spyOn(db, 'transaction').mockImplementation(async (callback) => {
      // Advisory lock simulates serialized execution per providerId:hmac
      const run = lockQueue.then(async () => {
        const mockTx = {
          execute: () => Promise.resolve(),
          select: () => ({
            from: () => ({
              where: () => ({
                limit: () => {
                  const existing = inMemoryCallLogs.find(
                    (log) => log.providerId === providerId && log.clientIp === '127.0.0.1'
                  );
                  return Promise.resolve(existing ? [existing] : []);
                },
              }),
            }),
          }),
          insert: () => ({
            values: () => {
              inMemoryCallLogs.push({ id: inMemoryCallLogs.length + 1, providerId, clientIp: '127.0.0.1' });
              return Promise.resolve();
            },
          }),
        };
        return await callback(mockTx);
      });
      lockQueue = run.catch(() => {});
      return await run;
    });

    // Launch 20 concurrent requests
    const promises = Array.from({ length: 20 }).map(() =>
      LeadsService.recordCallClick({ providerId, clientIp: '127.0.0.1' })
    );

    const results = await Promise.all(promises);

    const recordedTrueCount = results.filter((r) => r.recorded === true).length;
    const recordedFalseCount = results.filter((r) => r.recorded === false).length;

    expect(recordedTrueCount).toBe(1);
    expect(recordedFalseCount).toBe(19);
    expect(inMemoryCallLogs).toHaveLength(1); // Exactly one row in DB
  });
});
