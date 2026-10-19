import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { app } from '../../src/app.js';
import { db } from '../../src/db/client.js';
import { signAccessToken } from '../../src/lib/tokens.js';
import * as schema from '../../src/db/schema.js';
import { comparePassword } from '../../src/lib/crypto.js';

describe('Admin Password Reset (POST /api/admin/providers/:id/reset-password)', () => {
  const adminId = 1;
  const adminToken = signAccessToken({ sub: adminId, role: 'ADMIN' });
  const providerToken = signAccessToken({ sub: 10, role: 'PROVIDER' });

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  const mockProvider = {
    id: 10,
    fullName: 'Test Provider',
    phone: '+251911223344',
    passwordHash: '$2b$10$oldHashValueHere123456789012345678901234567890',
    mustChangePassword: false,
    verificationStatus: 'APPROVED',
    isActive: true,
  };

  it('admin successfully resets provider password and returns temporary password once (spec §4.4)', async () => {
    vi.spyOn(db, 'select').mockImplementation(() => ({
      from: () => ({
        where: () => ({
          limit: () => Promise.resolve([mockProvider]),
        }),
      }),
    }));

    let updatedProviderData = null;
    let revokedTokens = false;
    let auditLogEntry = null;

    vi.spyOn(db, 'transaction').mockImplementation(async (callback) => {
      const mockTx = {
        update: (table) => ({
          set: (data) => ({
            where: () => {
              if (table === schema.providers) {
                updatedProviderData = data;
              } else if (table === schema.refreshTokens) {
                revokedTokens = true;
              }
              return Promise.resolve();
            },
          }),
        }),
        insert: () => ({
          values: (entry) => {
            auditLogEntry = entry;
            return Promise.resolve();
          },
        }),
      };
      return await callback(mockTx);
    });

    const res = await request(app)
      .post('/api/admin/providers/10/reset-password')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ reason: 'Provider called support after losing phone' });

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveProperty('temporaryPassword');

    const tempPassword = res.body.data.temporaryPassword;
    expect(typeof tempPassword).toBe('string');
    expect(tempPassword.length).toBeGreaterThanOrEqual(12);

    // Invariant: provider mustChangePassword set to true
    expect(updatedProviderData.mustChangePassword).toBe(true);

    // Invariant: passwordHash must be a valid bcrypt hash of the temporary password
    const matches = await comparePassword(tempPassword, updatedProviderData.passwordHash);
    expect(matches).toBe(true);

    // Invariant: refresh tokens revoked
    expect(revokedTokens).toBe(true);

    // Invariant: audit log entry written
    expect(auditLogEntry).not.toBeNull();
    expect(auditLogEntry.action).toBe('PROVIDER_PASSWORD_RESET');
    expect(auditLogEntry.targetId).toBe(10);
    expect(auditLogEntry.reason).toBe('Provider called support after losing phone');

    // CRITICAL EXIT CHECK (Invariant #4): Temporary password never appears in logs or audit entries
    expect(JSON.stringify(auditLogEntry)).not.toContain(tempPassword);
    expect(auditLogEntry.metadata).toEqual({ providerId: 10 });
  });

  it('temporary password never appears in audit log or metadata (assert in a test)', async () => {
    vi.spyOn(db, 'select').mockImplementation(() => ({
      from: () => ({
        where: () => ({
          limit: () => Promise.resolve([mockProvider]),
        }),
      }),
    }));

    let auditEntry = null;
    vi.spyOn(db, 'transaction').mockImplementation(async (callback) => {
      const mockTx = {
        update: () => ({ set: () => ({ where: () => Promise.resolve() }) }),
        insert: () => ({
          values: (entry) => {
            auditEntry = entry;
            return Promise.resolve();
          },
        }),
      };
      return await callback(mockTx);
    });

    const res = await request(app)
      .post('/api/admin/providers/10/reset-password')
      .set('Authorization', `Bearer ${adminToken}`)
      .send();

    expect(res.status).toBe(200);
    const tempPassword = res.body.data.temporaryPassword;

    // Assert that the raw temporary password does NOT leak into audit metadata or reason
    expect(JSON.stringify(auditEntry)).not.toContain(tempPassword);
  });

  it('rejects attempt by admin to supply an admin-chosen password', async () => {
    const res = await request(app)
      .post('/api/admin/providers/10/reset-password')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        password: 'AdminChosenPassword123',
      });

    // Zod strict schema rejects unknown fields
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('rejects non-admin role with 403', async () => {
    const res = await request(app)
      .post('/api/admin/providers/10/reset-password')
      .set('Authorization', `Bearer ${providerToken}`)
      .send();

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('FORBIDDEN');
  });

  it('returns 404 for unknown provider', async () => {
    vi.spyOn(db, 'select').mockImplementation(() => ({
      from: () => ({
        where: () => ({
          limit: () => Promise.resolve([]), // Provider not found
        }),
      }),
    }));

    const res = await request(app)
      .post('/api/admin/providers/999/reset-password')
      .set('Authorization', `Bearer ${adminToken}`)
      .send();

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });
});
