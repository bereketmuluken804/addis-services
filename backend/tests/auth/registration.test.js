import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AuthService } from '../../src/modules/auth/auth.service.js';
import { db } from '../../src/db/client.js';
import { getStorage } from '../../src/lib/storage/index.js';

describe('Auth Registration & Orphan Cleanup (src/modules/auth/auth.service.js)', () => {
  const storage = getStorage();

  beforeEach(() => {
    vi.restoreAllMocks();
    storage.clear();
  });

  const validProviderData = {
    fullName: 'Abebe Bikila',
    phone: '+251911234567',
    password: 'password123',
    cityId: 1,
    subCityId: 2,
    categoryId: 3,
  };

  const validFile = {
    buffer: Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46]), // JPEG
    verifiedMime: 'image/jpeg',
    verifiedExt: 'jpg',
  };

  it('creates PENDING + inactive provider and document row on successful registration', async () => {
    // 1. Mock DB queries for Category, City, SubCity, and existing check
    vi.spyOn(db, 'select').mockImplementation(() => ({
      from: () => ({
        where: () => ({
          limit: () => {
            // Return active category/city/subcity, and empty for existing provider
            return Promise.resolve([{ id: 1, isActive: true, cityId: 1 }]);
          },
        }),
      }),
    }));

    // Mock existingProvider check to return empty
    let selectCallCount = 0;
    vi.spyOn(db, 'select').mockImplementation(() => ({
      from: () => ({
        where: () => ({
          limit: () => {
            selectCallCount++;
            if (selectCallCount === 4) {
              return Promise.resolve([]); // No existing provider
            }
            return Promise.resolve([{ id: 1, isActive: true, cityId: 1 }]);
          },
        }),
      }),
    }));

    // Mock transaction execution
    const mockProvider = {
      id: 101,
      fullName: 'Abebe Bikila',
      phone: '+251911234567',
      passwordHash: 'hashed_pw',
      verificationStatus: 'PENDING',
      isActive: false,
      isAvailable: false,
    };

    vi.spyOn(db, 'transaction').mockImplementation(async (callback) => {
      const mockTx = {
        insert: () => ({
          values: () => ({
            returning: () => Promise.resolve([mockProvider]),
          }),
        }),
      };
      return await callback(mockTx);
    });

    const result = await AuthService.registerProvider(validProviderData, validFile);

    expect(result.provider.id).toBe(101);
    expect(result.provider.verificationStatus).toBe('PENDING');
    expect(result.provider.isActive).toBe(false);
    expect(result.provider.isAvailable).toBe(false);
    expect(result.provider).not.toHaveProperty('passwordHash');
    expect(result.tokens).toHaveProperty('accessToken');
    expect(result.tokens).toHaveProperty('refreshToken');

    // Storage should contain the uploaded document
    expect(storage.files.size).toBe(1);
  });

  it('cleans up orphaned uploaded file if DB transaction fails', async () => {
    let selectCallCount = 0;
    vi.spyOn(db, 'select').mockImplementation(() => ({
      from: () => ({
        where: () => ({
          limit: () => {
            selectCallCount++;
            if (selectCallCount === 4) return Promise.resolve([]);
            return Promise.resolve([{ id: 1, isActive: true, cityId: 1 }]);
          },
        }),
      }),
    }));

    // Simulate DB transaction error (e.g. database connection drops)
    vi.spyOn(db, 'transaction').mockRejectedValueOnce(
      new Error('Simulated database write failure')
    );

    const deleteSpy = vi.spyOn(storage, 'delete');

    await expect(
      AuthService.registerProvider(validProviderData, validFile)
    ).rejects.toThrow('Simulated database write failure');

    // Assert orphan cleanup was executed: file deleted from storage
    expect(deleteSpy).toHaveBeenCalledTimes(1);
    expect(storage.files.size).toBe(0);
  });

  it('rejects registration when category is inactive or missing', async () => {
    vi.spyOn(db, 'select').mockImplementation(() => ({
      from: () => ({
        where: () => ({
          limit: () => Promise.resolve([]), // Category not found
        }),
      }),
    }));

    await expect(
      AuthService.registerProvider(validProviderData, validFile)
    ).rejects.toThrow(/Selected category is invalid or inactive/);
  });

  it('rejects registration when sub-city does not belong to city', async () => {
    let call = 0;
    vi.spyOn(db, 'select').mockImplementation(() => ({
      from: () => ({
        where: () => ({
          limit: () => {
            call++;
            if (call === 1) return Promise.resolve([{ id: 3, isActive: true }]); // Category ok
            if (call === 2) return Promise.resolve([{ id: 1, isActive: true }]); // City ok
            return Promise.resolve([]); // SubCity not found under that city
          },
        }),
      }),
    }));

    await expect(
      AuthService.registerProvider(validProviderData, validFile)
    ).rejects.toThrow(/Selected sub-city is invalid, inactive, or does not belong/);
  });

  it('registers a customer user successfully and issues tokens', async () => {
    vi.spyOn(db, 'select').mockImplementation(() => ({
      from: () => ({
        where: () => ({
          limit: () => Promise.resolve([]), // Phone available
        }),
      }),
    }));

    const mockCustomer = {
      id: 202,
      fullName: 'Almaz Ayana',
      phone: '+251922334455',
      passwordHash: 'hashed_pw',
    };

    vi.spyOn(db, 'transaction').mockImplementation(async (callback) => {
      const mockTx = {
        insert: () => ({
          values: () => ({
            returning: () => Promise.resolve([mockCustomer]),
          }),
        }),
      };
      return await callback(mockTx);
    });

    const result = await AuthService.registerCustomer({
      fullName: 'Almaz Ayana',
      phone: '+251922334455',
      password: 'password123',
    });

    expect(result.customer.id).toBe(202);
    expect(result.customer).not.toHaveProperty('passwordHash');
    expect(result.tokens).toHaveProperty('accessToken');
    expect(result.tokens).toHaveProperty('refreshToken');
  });
});
