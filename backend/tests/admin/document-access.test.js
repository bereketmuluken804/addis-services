import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { app } from '../../src/app.js';
import { db } from '../../src/db/client.js';
import { signAccessToken } from '../../src/lib/tokens.js';
import { getStorage } from '../../src/lib/storage/index.js';

describe('Admin Document Access & Audit (src/modules/admin/admin.routes.js)', () => {
  const storage = getStorage();

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  const adminToken = signAccessToken({ sub: 1, role: 'ADMIN' });
  const providerToken = signAccessToken({ sub: 10, role: 'PROVIDER' });
  const customerToken = signAccessToken({ sub: 20, role: 'CUSTOMER' });

  it('rejects unauthenticated requests with 401', async () => {
    const res = await request(app).get('/api/admin/providers/10/verification-document');
    expect(res.status).toBe(401);
  });

  it('rejects provider role requests with 403 FORBIDDEN', async () => {
    const res = await request(app)
      .get('/api/admin/providers/10/verification-document')
      .set('Authorization', `Bearer ${providerToken}`);

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('FORBIDDEN');
  });

  it('rejects customer role requests with 403 FORBIDDEN', async () => {
    const res = await request(app)
      .get('/api/admin/providers/10/verification-document')
      .set('Authorization', `Bearer ${customerToken}`);

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('FORBIDDEN');
  });

  it('allows admin to obtain signed URL and writes audit entry without leaking keys', async () => {
    const mockDoc = {
      id: 5,
      providerId: 10,
      objectKey: 'id-docs/10/private-opaque-uuid.jpg',
      status: 'PENDING',
      uploadedAt: new Date().toISOString(),
    };

    // Populate fake storage with object
    await storage.upload({
      key: mockDoc.objectKey,
      buffer: Buffer.from('fake-image-bytes'),
      contentType: 'image/jpeg',
    });

    let selectCount = 0;
    vi.spyOn(db, 'select').mockImplementation(() => ({
      from: () => ({
        where: () => ({
          limit: () => {
            selectCount++;
            if (selectCount === 1) return Promise.resolve([{ id: 10 }]); // Provider found
            return Promise.resolve([mockDoc]); // Latest document found
          },
          orderBy: () => ({
            limit: () => Promise.resolve([mockDoc]),
          }),
        }),
      }),
    }));

    let auditLogged = false;
    let auditData = null;
    vi.spyOn(db, 'insert').mockImplementation(() => ({
      values: (val) => {
        auditLogged = true;
        auditData = val;
        return Promise.resolve();
      },
    }));

    const res = await request(app)
      .get('/api/admin/providers/10/verification-document')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveProperty('signedUrl');
    expect(res.body.data.expiresInSeconds).toBe(120);

    // Invariant #4: Admin gets signedUrl, but objectKey field is never exposed in response
    expect(res.body.data).toHaveProperty('signedUrl');
    expect(res.body.data).not.toHaveProperty('objectKey');

    // Audit log was written
    expect(auditLogged).toBe(true);
    expect(auditData.action).toBe('DOCUMENT_ACCESS');
    expect(auditData.targetType).toBe('PROVIDER_DOCUMENT');
    expect(auditData.targetId).toBe(5);
  });
});
