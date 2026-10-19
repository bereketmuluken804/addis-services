import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { app } from '../../src/app.js';
import { db } from '../../src/db/client.js';
import { signAccessToken } from '../../src/lib/tokens.js';
import { hashPassword } from '../../src/lib/crypto.js';
import * as schema from '../../src/db/schema.js';

describe('Admin-Mediated Phone Change (spec §4.5, §6.4, §6.6)', () => {
  const providerId = 55;
  const adminId = 1;
  const customerId = 88;

  const providerToken = signAccessToken({ sub: providerId, role: 'PROVIDER' });
  const adminToken = signAccessToken({ sub: adminId, role: 'ADMIN' });
  const customerToken = signAccessToken({ sub: customerId, role: 'CUSTOMER' });

  const currentPhone = '+251911000000';
  const newPhone = '+251922334455';
  const currentPassword = 'SecurePassword123!';

  let mockProvider;

  beforeEach(async () => {
    vi.restoreAllMocks();

    const passwordHash = await hashPassword(currentPassword);
    mockProvider = {
      id: providerId,
      fullName: 'Abebe Tola',
      phone: currentPhone,
      passwordHash,
      mustChangePassword: false,
      verificationStatus: 'APPROVED',
      isActive: true,
      isAvailable: true,
    };
  });

  describe('Provider Phone Change Request Submission (spec §4.5, §6.4)', () => {
    it('creates a PENDING phone change request with valid password and normalized phone', async () => {
      // Mock db.select for provider verification and duplicate check
      let selectCall = 0;
      vi.spyOn(db, 'select').mockImplementation(() => ({
        from: () => ({
          where: () => {
            selectCall++;
            if (selectCall === 1) {
              // enforceMustChangePassword gate
              return { limit: () => Promise.resolve([mockProvider]) };
            }
            if (selectCall === 2) {
              // Check existing provider with newPhone (none)
              return { limit: () => Promise.resolve([]) };
            }
            if (selectCall === 3) {
              // Check existing pending request (none)
              return { limit: () => Promise.resolve([]) };
            }
            return { limit: () => Promise.resolve([]) };
          },
        }),
      }));

      const mockCreatedRequest = {
        id: 1,
        providerId,
        newPhone,
        reason: 'Lost old SIM card',
        status: 'PENDING',
        createdAt: new Date(),
      };

      vi.spyOn(db, 'insert').mockImplementation(() => ({
        values: () => ({
          returning: () => Promise.resolve([mockCreatedRequest]),
        }),
      }));

      const res = await request(app)
        .post('/api/provider/me/phone-change-requests')
        .set('Authorization', `Bearer ${providerToken}`)
        .send({
          newPhone: '0922334455', // Local format to normalize
          currentPassword,
          reason: 'Lost old SIM card',
        });

      expect(res.status).toBe(201);
      expect(res.body.data.id).toBe(1);
      expect(res.body.data.newPhone).toBe(newPhone); // Normalized to E.164
      expect(res.body.data.status).toBe('PENDING');
    });

    it('rejects wrong current password with 401 INVALID_CREDENTIALS (Exit Check)', async () => {
      vi.spyOn(db, 'select').mockImplementation(() => ({
        from: () => ({
          where: () => ({
            limit: () => Promise.resolve([mockProvider]),
          }),
        }),
      }));

      const res = await request(app)
        .post('/api/provider/me/phone-change-requests')
        .set('Authorization', `Bearer ${providerToken}`)
        .send({
          newPhone: '0922334455',
          currentPassword: 'WrongPassword123',
        });

      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('INVALID_CREDENTIALS');
    });

    it('rejects malformed phone numbers with 422 INVALID_PHONE (Exit Check)', async () => {
      vi.spyOn(db, 'select').mockImplementation(() => ({
        from: () => ({
          where: () => ({
            limit: () => Promise.resolve([mockProvider]),
          }),
        }),
      }));

      const res = await request(app)
        .post('/api/provider/me/phone-change-requests')
        .set('Authorization', `Bearer ${providerToken}`)
        .send({
          newPhone: '0111223344', // Landline, invalid prefix
          currentPassword,
        });

      expect(res.status).toBe(422);
      expect(res.body.error.code).toBe('INVALID_PHONE');
    });

    it('rejects duplicate number already registered to another provider with 409 (Exit Check)', async () => {
      let selectCall = 0;
      vi.spyOn(db, 'select').mockImplementation(() => ({
        from: () => ({
          where: () => {
            selectCall++;
            if (selectCall === 1) {
              // enforceMustChangePassword gate
              return { limit: () => Promise.resolve([mockProvider]) };
            }
            if (selectCall === 2) {
              // Existing provider with newPhone exists!
              return { limit: () => Promise.resolve([{ id: 99 }]) };
            }
            return { limit: () => Promise.resolve([]) };
          },
        }),
      }));

      const res = await request(app)
        .post('/api/provider/me/phone-change-requests')
        .set('Authorization', `Bearer ${providerToken}`)
        .send({
          newPhone: '0922334455',
          currentPassword,
        });

      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe('DUPLICATE_PHONE');
    });

    it('enforces one pending request per provider returning 409 (Exit Check)', async () => {
      let selectCall = 0;
      vi.spyOn(db, 'select').mockImplementation(() => ({
        from: () => ({
          where: () => {
            selectCall++;
            if (selectCall === 1) {
              // enforceMustChangePassword gate
              return { limit: () => Promise.resolve([mockProvider]) };
            }
            if (selectCall === 2) {
              return { limit: () => Promise.resolve([]) }; // No duplicate phone
            }
            if (selectCall === 3) {
              // An existing PENDING request already exists!
              return { limit: () => Promise.resolve([{ id: 7 }]) };
            }
            return { limit: () => Promise.resolve([]) };
          },
        }),
      }));

      const res = await request(app)
        .post('/api/provider/me/phone-change-requests')
        .set('Authorization', `Bearer ${providerToken}`)
        .send({
          newPhone: '0922334455',
          currentPassword,
        });

      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe('PENDING_REQUEST_EXISTS');
    });

    it('allows provider to view current request and cancel it', async () => {
      const mockRequest = {
        id: 10,
        newPhone,
        reason: 'SIM lost',
        status: 'PENDING',
        rejectionReason: null,
        createdAt: new Date(),
        reviewedAt: null,
      };

      // 1. GET current request
      let selectCall = 0;
      vi.spyOn(db, 'select').mockImplementation(() => ({
        from: () => ({
          where: () => ({
            orderBy: () => ({
              limit: () => Promise.resolve([mockRequest]),
            }),
            limit: () => {
              selectCall++;
              if (selectCall === 1) return Promise.resolve([mockProvider]); // gate
              return Promise.resolve([mockRequest]);
            },
          }),
        }),
      }));

      const resGet = await request(app)
        .get('/api/provider/me/phone-change-requests/current')
        .set('Authorization', `Bearer ${providerToken}`);

      expect(resGet.status).toBe(200);
      expect(resGet.body.data.id).toBe(10);
      expect(resGet.body.data.status).toBe('PENDING');

      // 2. DELETE cancel current request
      let cancelled = false;
      vi.spyOn(db, 'update').mockImplementation(() => ({
        set: (data) => ({
          where: () => {
            if (data.status === 'CANCELLED') cancelled = true;
            return Promise.resolve();
          },
        }),
      }));

      const resCancel = await request(app)
        .delete('/api/provider/me/phone-change-requests/current')
        .set('Authorization', `Bearer ${providerToken}`);

      expect(resCancel.status).toBe(200);
      expect(resCancel.body.data.message).toContain('cancelled');
      expect(cancelled).toBe(true);
    });
  });

  describe('Admin Phone Change Decision (spec §4.5, §6.6)', () => {
    const mockPendingRequest = {
      id: 5,
      providerId,
      newPhone,
      reason: 'Lost SIM card',
      status: 'PENDING',
      createdAt: new Date(),
    };

    it('admin approval updates phone, revokes refresh tokens, and writes audit entry (Exit Check)', async () => {
      vi.spyOn(db, 'select').mockImplementation(() => ({
        from: (table) => ({
          where: () => ({
            limit: () => {
              if (table === schema.phoneChangeRequests) {
                return Promise.resolve([mockPendingRequest]);
              }
              return Promise.resolve([]); // schema.providers duplicate check
            },
          }),
        }),
      }));

      let updatedProviderPhone = null;
      let updatedRequestStatus = null;
      let revokedTokens = false;
      let auditLogEntry = null;

      vi.spyOn(db, 'transaction').mockImplementation(async (callback) => {
        const mockTx = {
          update: (table) => ({
            set: (data) => ({
              where: () => {
                if (table === schema.providers) {
                  updatedProviderPhone = data.phone;
                } else if (table === schema.phoneChangeRequests) {
                  updatedRequestStatus = data.status;
                  return { returning: () => Promise.resolve([{ ...mockPendingRequest, ...data }]) };
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
        .patch('/api/admin/phone-change-requests/5')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          status: 'APPROVED',
        });

      expect(res.status).toBe(200);
      expect(updatedProviderPhone).toBe(newPhone);
      expect(updatedRequestStatus).toBe('APPROVED');
      expect(revokedTokens).toBe(true);

      // Audit log entry
      expect(auditLogEntry).not.toBeNull();
      expect(auditLogEntry.action).toBe('PHONE_CHANGE_APPROVAL');
      expect(auditLogEntry.targetId).toBe(5);
      expect(auditLogEntry.metadata).toEqual({
        providerId,
        requestedPhone: newPhone,
      });
    });

    it('admin rejection records reason, leaves phone unchanged, and writes audit entry (Exit Check)', async () => {
      vi.spyOn(db, 'select').mockImplementation(() => ({
        from: () => ({
          where: () => ({
            limit: () => Promise.resolve([mockPendingRequest]),
          }),
        }),
      }));

      let auditLogEntry = null;
      let updatedStatus = null;

      vi.spyOn(db, 'transaction').mockImplementation(async (callback) => {
        const mockTx = {
          update: () => ({
            set: (data) => ({
              where: () => {
                updatedStatus = data.status;
                return { returning: () => Promise.resolve([{ ...mockPendingRequest, ...data }]) };
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
        .patch('/api/admin/phone-change-requests/5')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          status: 'REJECTED',
          rejectionReason: 'ID verification call could not be completed',
        });

      expect(res.status).toBe(200);
      expect(updatedStatus).toBe('REJECTED');
      expect(auditLogEntry.action).toBe('PHONE_CHANGE_REJECTION');
      expect(auditLogEntry.reason).toBe('ID verification call could not be completed');
    });

    it('rejects decision on non-pending request with 409 (Exit Check)', async () => {
      vi.spyOn(db, 'select').mockImplementation(() => ({
        from: () => ({
          where: () => ({
            limit: () => Promise.resolve([{ ...mockPendingRequest, status: 'APPROVED' }]), // Already decided
          }),
        }),
      }));

      const res = await request(app)
        .patch('/api/admin/phone-change-requests/5')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          status: 'APPROVED',
        });

      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe('INVALID_STATE');
    });

    it('rejects non-admin role with 403 (Exit Check)', async () => {
      const res = await request(app)
        .patch('/api/admin/phone-change-requests/5')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          status: 'APPROVED',
        });

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    it('allows admin to list phone change requests with status filter', async () => {
      const mockList = [
        {
          id: 5,
          providerId,
          providerName: 'Abebe Tola',
          currentPhone,
          requestedPhone: newPhone,
          reason: 'Lost SIM card',
          status: 'PENDING',
          rejectionReason: null,
          createdAt: new Date(),
          reviewedAt: null,
        },
      ];

      vi.spyOn(db, 'select').mockImplementation(() => ({
        from: () => ({
          innerJoin: () => ({
            where: () => ({
              orderBy: () => ({
                limit: () => ({
                  offset: () => Promise.resolve(mockList),
                }),
              }),
            }),
          }),
          where: () => Promise.resolve([{ total: 1 }]),
        }),
      }));

      const res = await request(app)
        .get('/api/admin/phone-change-requests?status=PENDING&page=1&limit=10')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].providerName).toBe('Abebe Tola');
      expect(res.body.pagination.total).toBe(1);
    });
  });
});
