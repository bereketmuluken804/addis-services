import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AdminService } from '../../src/modules/admin/admin.service.js';
import { db } from '../../src/db/client.js';

describe('Admin Verification Transitions & Activation (src/modules/admin/admin.service.js)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  const adminId = 99;
  const providerId = 10;

  describe('§3.2 Verification Transitions Table', () => {
    it('transitions PENDING -> APPROVED when a pending document exists without activating', async () => {
      const mockProvider = {
        id: providerId,
        verificationStatus: 'PENDING',
        isActive: false,
      };

      const mockDoc = {
        id: 1,
        providerId,
        status: 'PENDING',
        uploadedAt: new Date(),
      };

      vi.spyOn(db, 'transaction').mockImplementation(async (callback) => {
        const mockTx = {
          select: () => ({
            from: () => ({
              where: () => ({
                limit: () => Promise.resolve([mockProvider]),
                orderBy: () => ({
                  limit: () => Promise.resolve([mockDoc]),
                }),
              }),
            }),
          }),
          update: () => ({
            set: () => ({
              where: () => ({
                returning: () =>
                  Promise.resolve([
                    {
                      ...mockProvider,
                      verificationStatus: 'APPROVED',
                    },
                  ]),
              }),
            }),
          }),
          insert: () => ({
            values: () => Promise.resolve(),
          }),
        };
        return await callback(mockTx);
      });

      const updated = await AdminService.transitionVerification({
        providerId,
        targetStatus: 'APPROVED',
        adminId,
      });

      expect(updated.verificationStatus).toBe('APPROVED');
      expect(updated.isActive).toBe(false); // Does not activate
    });

    it('transitions PENDING -> REJECTED and atomically sets isActive = false', async () => {
      const mockProvider = {
        id: providerId,
        verificationStatus: 'PENDING',
        isActive: true, // Suppose it was true somehow
      };

      const mockDoc = { id: 1, status: 'PENDING', uploadedAt: new Date() };

      let updatedFields = null;
      vi.spyOn(db, 'transaction').mockImplementation(async (callback) => {
        const mockTx = {
          select: () => ({
            from: () => ({
              where: () => ({
                limit: () => Promise.resolve([mockProvider]),
                orderBy: () => ({
                  limit: () => Promise.resolve([mockDoc]),
                }),
              }),
            }),
          }),
          update: () => ({
            set: (fields) => {
              updatedFields = fields;
              return {
                where: () => ({
                  returning: () =>
                    Promise.resolve([
                      {
                        ...mockProvider,
                        ...fields,
                      },
                    ]),
                }),
              };
            },
          }),
          insert: () => ({
            values: () => Promise.resolve(),
          }),
        };
        return await callback(mockTx);
      });

      const updated = await AdminService.transitionVerification({
        providerId,
        targetStatus: 'REJECTED',
        rejectionReason: 'ID blurry and unreadable',
        adminId,
      });

      expect(updated.verificationStatus).toBe('REJECTED');
      expect(updated.isActive).toBe(false); // Invariant #3: Atomically false
      expect(updatedFields.isActive).toBe(false);
      expect(updatedFields.verificationRejectionReason).toBe('ID blurry and unreadable');
    });

    it('transitions APPROVED -> REVOKED and atomically sets isActive = false', async () => {
      const mockProvider = {
        id: providerId,
        verificationStatus: 'APPROVED',
        isActive: true,
      };

      const mockDoc = { id: 1, status: 'APPROVED', uploadedAt: new Date() };

      let updatedFields = null;
      vi.spyOn(db, 'transaction').mockImplementation(async (callback) => {
        const mockTx = {
          select: () => ({
            from: () => ({
              where: () => ({
                limit: () => Promise.resolve([mockProvider]),
                orderBy: () => ({
                  limit: () => Promise.resolve([mockDoc]),
                }),
              }),
            }),
          }),
          update: () => ({
            set: (fields) => {
              updatedFields = fields;
              return {
                where: () => ({
                  returning: () =>
                    Promise.resolve([
                      {
                        ...mockProvider,
                        ...fields,
                      },
                    ]),
                }),
              };
            },
          }),
          insert: () => ({
            values: () => Promise.resolve(),
          }),
        };
        return await callback(mockTx);
      });

      const updated = await AdminService.transitionVerification({
        providerId,
        targetStatus: 'REVOKED',
        rejectionReason: 'Fraudulent document detected',
        adminId,
      });

      expect(updated.verificationStatus).toBe('REVOKED');
      expect(updated.isActive).toBe(false); // Invariant #3
      expect(updatedFields.isActive).toBe(false);
      expect(updatedFields.verificationRejectionReason).toBe('Fraudulent document detected');
    });

    it('transitions REVOKED -> PENDING (admin explicit reopen)', async () => {
      const mockProvider = {
        id: providerId,
        verificationStatus: 'REVOKED',
        isActive: false,
      };

      vi.spyOn(db, 'transaction').mockImplementation(async (callback) => {
        const mockTx = {
          select: () => ({
            from: () => ({
              where: () => ({
                limit: () => Promise.resolve([mockProvider]),
              }),
            }),
          }),
          update: () => ({
            set: (fields) => ({
              where: () => ({
                returning: () => Promise.resolve([{ ...mockProvider, ...fields }]),
              }),
            }),
          }),
          insert: () => ({
            values: () => Promise.resolve(),
          }),
        };
        return await callback(mockTx);
      });

      const updated = await AdminService.transitionVerification({
        providerId,
        targetStatus: 'PENDING',
        rejectionReason: 'Reopened by support',
        adminId,
      });

      expect(updated.verificationStatus).toBe('PENDING');
    });

    it.each([
      ['PENDING', 'REVOKED'],
      ['APPROVED', 'REJECTED'],
      ['APPROVED', 'PENDING'],
      ['REJECTED', 'APPROVED'],
      ['REJECTED', 'REVOKED'],
    ])('rejects illegal transition %s -> %s with 409 INVALID_TRANSITION', async (from, to) => {
      const mockProvider = {
        id: providerId,
        verificationStatus: from,
        isActive: false,
      };

      vi.spyOn(db, 'transaction').mockImplementation(async (callback) => {
        const mockTx = {
          select: () => ({
            from: () => ({
              where: () => ({
                limit: () => Promise.resolve([mockProvider]),
              }),
            }),
          }),
        };
        return await callback(mockTx);
      });

      await expect(
        AdminService.transitionVerification({
          providerId,
          targetStatus: to,
          rejectionReason: 'Some reason',
          adminId,
        })
      ).rejects.toMatchObject({
        statusCode: 409,
        code: 'INVALID_TRANSITION',
      });
    });
  });

  describe('§3.3 Activation', () => {
    it('activates provider when verificationStatus is APPROVED', async () => {
      const mockProvider = {
        id: providerId,
        verificationStatus: 'APPROVED',
        isActive: false,
      };

      let activated = false;
      vi.spyOn(db, 'transaction').mockImplementation(async (callback) => {
        const mockTx = {
          select: () => ({
            from: () => ({
              where: () => ({
                limit: () => Promise.resolve([mockProvider]),
              }),
            }),
          }),
          update: () => ({
            set: (fields) => {
              if (fields.isActive === true) activated = true;
              return {
                where: () => ({
                  returning: () => Promise.resolve([{ ...mockProvider, ...fields }]),
                }),
              };
            },
          }),
          insert: () => ({
            values: () => Promise.resolve(),
          }),
        };
        return await callback(mockTx);
      });

      const result = await AdminService.updateActivation({
        providerId,
        isActive: true,
        adminId,
      });

      expect(result.isActive).toBe(true);
      expect(activated).toBe(true);
    });

    it('rejects activation with 409 when provider is not APPROVED', async () => {
      const mockProvider = {
        id: providerId,
        verificationStatus: 'PENDING',
        isActive: false,
      };

      vi.spyOn(db, 'transaction').mockImplementation(async (callback) => {
        const mockTx = {
          select: () => ({
            from: () => ({
              where: () => ({
                limit: () => Promise.resolve([mockProvider]),
              }),
            }),
          }),
        };
        return await callback(mockTx);
      });

      await expect(
        AdminService.updateActivation({
          providerId,
          isActive: true,
          adminId,
        })
      ).rejects.toMatchObject({
        statusCode: 409,
        code: 'INVALID_STATE',
      });
    });

    it('suspends provider and records reason and suspension metadata', async () => {
      const mockProvider = {
        id: providerId,
        verificationStatus: 'APPROVED',
        isActive: true,
      };

      let updateFields = null;
      vi.spyOn(db, 'transaction').mockImplementation(async (callback) => {
        const mockTx = {
          select: () => ({
            from: () => ({
              where: () => ({
                limit: () => Promise.resolve([mockProvider]),
              }),
            }),
          }),
          update: () => ({
            set: (fields) => {
              updateFields = fields;
              return {
                where: () => ({
                  returning: () => Promise.resolve([{ ...mockProvider, ...fields }]),
                }),
              };
            },
          }),
          insert: () => ({
            values: () => Promise.resolve(),
          }),
        };
        return await callback(mockTx);
      });

      const result = await AdminService.updateActivation({
        providerId,
        isActive: false,
        reason: 'Customer complaints under investigation',
        adminId,
      });

      expect(result.isActive).toBe(false);
      expect(updateFields.suspensionReason).toBe('Customer complaints under investigation');
      expect(updateFields.suspendedBy).toBe(adminId);
    });
  });
});
