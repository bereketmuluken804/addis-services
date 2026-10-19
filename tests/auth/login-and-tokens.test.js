import { describe, it, expect, vi, beforeEach } from 'vitest';
import bcrypt from 'bcrypt';
import { AuthService } from '../../src/modules/auth/auth.service.js';
import { db } from '../../src/db/client.js';
import * as cryptoLib from '../../src/lib/crypto.js';

describe('Auth Login & Token Rotation with Reuse Detection (src/modules/auth/auth.service.js)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('Login & Timing Attack Protections', () => {
    it('logs in provider with correct credentials and returns safe provider projection', async () => {
      const passwordHash = await bcrypt.hash('secret123', 4);
      const mockProvider = {
        id: 1,
        fullName: 'Test Provider',
        phone: '+251911234567',
        passwordHash,
        verificationStatus: 'PENDING',
        isActive: false,
      };

      vi.spyOn(db, 'select').mockImplementation(() => ({
        from: () => ({
          where: () => ({
            limit: () => Promise.resolve([mockProvider]),
          }),
        }),
      }));

      vi.spyOn(db, 'transaction').mockImplementation(async (callback) => {
        const mockTx = {
          insert: () => ({
            values: () => Promise.resolve(),
          }),
        };
        return await callback(mockTx);
      });

      const result = await AuthService.loginProvider({
        phone: '+251911234567',
        password: 'secret123',
      });

      expect(result.provider.id).toBe(1);
      expect(result.provider).not.toHaveProperty('passwordHash');
      expect(result.tokens).toHaveProperty('accessToken');
      expect(result.tokens).toHaveProperty('refreshToken');
    });

    it('returns generic 401 INVALID_CREDENTIALS on wrong password', async () => {
      const passwordHash = await bcrypt.hash('correct_password', 4);
      const mockProvider = {
        id: 1,
        phone: '+251911234567',
        passwordHash,
      };

      vi.spyOn(db, 'select').mockImplementation(() => ({
        from: () => ({
          where: () => ({
            limit: () => Promise.resolve([mockProvider]),
          }),
        }),
      }));

      await expect(
        AuthService.loginProvider({
          phone: '+251911234567',
          password: 'wrong_password',
        })
      ).rejects.toMatchObject({
        statusCode: 401,
        code: 'INVALID_CREDENTIALS',
      });
    });

    it('returns generic 401 and performs dummy compare when account does not exist', async () => {
      vi.spyOn(db, 'select').mockImplementation(() => ({
        from: () => ({
          where: () => ({
            limit: () => Promise.resolve([]), // User not found
          }),
        }),
      }));

      const dummyCompareSpy = vi.spyOn(cryptoLib, 'dummyPasswordCompare');

      await expect(
        AuthService.loginProvider({
          phone: '+251999999999',
          password: 'any_password',
        })
      ).rejects.toMatchObject({
        statusCode: 401,
        code: 'INVALID_CREDENTIALS',
      });

      expect(dummyCompareSpy).toHaveBeenCalledTimes(1);
    });
  });

  describe('Refresh Token Rotation & Family Reuse Detection', () => {
    it('rotates refresh token and returns new access token', async () => {
      const futureExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      const mockTokenRecord = {
        id: 1,
        familyId: 'family-uuid-1234',
        providerId: 42,
        expiresAt: futureExpiry,
        revokedAt: null,
        replacedByTokenHash: null,
      };

      vi.spyOn(db, 'select').mockImplementation(() => ({
        from: () => ({
          where: () => ({
            limit: () => Promise.resolve([mockTokenRecord]),
          }),
        }),
      }));

      let updatedToken = false;
      let insertedNewToken = false;

      vi.spyOn(db, 'transaction').mockImplementation(async (callback) => {
        const mockTx = {
          update: () => ({
            set: () => ({
              where: () => {
                updatedToken = true;
                return Promise.resolve();
              },
            }),
          }),
          insert: () => ({
            values: () => {
              insertedNewToken = true;
              return Promise.resolve();
            },
          }),
        };
        return await callback(mockTx);
      });

      const result = await AuthService.refreshTokens('valid_raw_token');

      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
      expect(updatedToken).toBe(true);
      expect(insertedNewToken).toBe(true);
    });

    it('detects refresh token reuse and revokes entire family', async () => {
      const mockReusedToken = {
        id: 1,
        familyId: 'family-uuid-1234',
        providerId: 42,
        expiresAt: new Date(Date.now() + 100000),
        revokedAt: new Date(), // Already revoked!
        replacedByTokenHash: 'some_other_hash',
      };

      vi.spyOn(db, 'select').mockImplementation(() => ({
        from: () => ({
          where: () => ({
            limit: () => Promise.resolve([mockReusedToken]),
          }),
        }),
      }));

      let familyRevoked = false;
      vi.spyOn(db, 'update').mockImplementation(() => ({
        set: () => ({
          where: () => {
            familyRevoked = true;
            return Promise.resolve();
          },
        }),
      }));

      await expect(
        AuthService.refreshTokens('already_used_refresh_token')
      ).rejects.toMatchObject({
        statusCode: 401,
        code: 'REFRESH_TOKEN_REUSE',
      });

      // Entire family must have been revoked
      expect(familyRevoked).toBe(true);
    });

    it('rejects expired refresh token', async () => {
      const pastExpiry = new Date(Date.now() - 100000); // Expired
      const mockExpiredToken = {
        id: 1,
        familyId: 'family-uuid-1234',
        providerId: 42,
        expiresAt: pastExpiry,
        revokedAt: null,
        replacedByTokenHash: null,
      };

      vi.spyOn(db, 'select').mockImplementation(() => ({
        from: () => ({
          where: () => ({
            limit: () => Promise.resolve([mockExpiredToken]),
          }),
        }),
      }));

      vi.spyOn(db, 'update').mockImplementation(() => ({
        set: () => ({
          where: () => Promise.resolve(),
        }),
      }));

      await expect(
        AuthService.refreshTokens('expired_token')
      ).rejects.toMatchObject({
        statusCode: 401,
        code: 'REFRESH_TOKEN_EXPIRED',
      });
    });
  });

  describe('Logout', () => {
    it('revokes the entire token family upon logout', async () => {
      const mockToken = {
        id: 1,
        familyId: 'family-uuid-to-revoke',
      };

      vi.spyOn(db, 'select').mockImplementation(() => ({
        from: () => ({
          where: () => ({
            limit: () => Promise.resolve([mockToken]),
          }),
        }),
      }));

      let familyRevoked = false;
      vi.spyOn(db, 'update').mockImplementation(() => ({
        set: () => ({
          where: () => {
            familyRevoked = true;
            return Promise.resolve();
          },
        }),
      }));

      await AuthService.logout('raw_logout_token');

      expect(familyRevoked).toBe(true);
    });
  });
});
