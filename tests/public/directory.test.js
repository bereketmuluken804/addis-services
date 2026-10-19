import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { app } from '../../src/app.js';
import { db } from '../../src/db/client.js';

describe('Public Directory API (src/modules/public/public.routes.js)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  const mockCategories = [
    { id: 1, nameEn: 'Plumbing', nameAm: 'የቧንቧ ስራ', slug: 'plumbing', iconName: 'wrench', displayOrder: 1 },
    { id: 2, nameEn: 'Electrical', nameAm: 'የኤሌክትሪክ ስራ', slug: 'electrical', iconName: 'zap', displayOrder: 2 },
  ];

  const mockCities = [
    { id: 1, nameEn: 'Addis Ababa', nameAm: 'አዲስ አበባ', slug: 'addis-ababa', isActive: true },
  ];

  const mockSubCities = [
    { id: 10, cityId: 1, nameEn: 'Bole', nameAm: 'ቦሌ', slug: 'bole', isActive: true },
    { id: 11, cityId: 1, nameEn: 'Arada', nameAm: 'አራዳ', slug: 'arada', isActive: true },
  ];

  it('GET /api/categories returns active categories ordered by displayOrder', async () => {
    vi.spyOn(db, 'select').mockImplementation(() => ({
      from: () => ({
        where: () => ({
          orderBy: () => Promise.resolve(mockCategories),
        }),
      }),
    }));

    const res = await request(app).get('/api/categories');
    expect(res.status).toBe(200);
    expect(res.body.data).toEqual(mockCategories);
  });

  it('GET /api/locations returns active cities with nested sub-cities', async () => {
    let call = 0;
    vi.spyOn(db, 'select').mockImplementation(() => ({
      from: () => ({
        where: () => {
          call++;
          if (call === 1) return Promise.resolve(mockCities);
          return Promise.resolve(mockSubCities);
        },
      }),
    }));

    const res = await request(app).get('/api/locations');
    expect(res.status).toBe(200);
    expect(res.body.data[0]).toMatchObject({
      id: 1,
      nameEn: 'Addis Ababa',
      subCities: [
        { id: 10, nameEn: 'Bole' },
        { id: 11, nameEn: 'Arada' },
      ],
    });
  });

  describe('GET /api/providers & GET /api/providers/:id', () => {
    const eligibleProviderRow = {
      id: 50,
      fullName: 'Bekele Debele',
      phone: '+251911223344',
      bio: 'Expert electrician',
      experienceYears: 8,
      avatarUrl: 'https://images.unsplash.com/photo-sample',
      workSamples: [],
      isAvailable: false, // Invariant #2: availability does not hide listing
      woreda: '03',
      category: { id: 2, nameEn: 'Electrical', nameAm: 'የኤሌክትሪክ ስራ', slug: 'electrical', iconName: 'zap' },
      city: { id: 1, nameEn: 'Addis Ababa', nameAm: 'አዲስ አበባ' },
      subCity: { id: 10, nameEn: 'Bole', nameAm: 'ቦሌ' },
      reviewStats: { averageRating: 4.5, reviewCount: 6 },
    };

    it('returns only approved + active providers; unavailable provider stays visible with badge', async () => {
      vi.spyOn(db, 'select').mockImplementation(() => ({
        from: () => ({
          innerJoin: () => ({
            innerJoin: () => ({
              innerJoin: () => ({
                leftJoin: () => ({
                  where: () => ({
                    groupBy: () => ({
                      limit: () => ({
                        offset: () => Promise.resolve([eligibleProviderRow]),
                      }),
                    }),
                  }),
                }),
              }),
            }),
          }),
          where: () => Promise.resolve([{ totalCount: 1 }]),
        }),
      }));

      const res = await request(app).get('/api/providers');
      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].id).toBe(50);
      expect(res.body.data[0].isAvailable).toBe(false); // Visible with badge
      expect(res.body.data[0].averageRating).toBe(4.5);
      expect(res.body.data[0].reviewCount).toBe(6);
      expect(res.body.data[0]).not.toHaveProperty('passwordHash');
    });

    it('GET /api/providers/:id returns 200 for eligible provider', async () => {
      vi.spyOn(db, 'select').mockImplementation(() => ({
        from: () => ({
          innerJoin: () => ({
            innerJoin: () => ({
              innerJoin: () => ({
                leftJoin: () => ({
                  where: () => ({
                    groupBy: () => ({
                      limit: () => Promise.resolve([eligibleProviderRow]),
                    }),
                  }),
                }),
              }),
            }),
          }),
        }),
      }));

      const res = await request(app).get('/api/providers/50');
      expect(res.status).toBe(200);
      expect(res.body.data.id).toBe(50);
      expect(res.body.data.fullName).toBe('Bekele Debele');
    });

    it('GET /api/providers/:id returns 404 for ineligible provider (Invariant #1)', async () => {
      vi.spyOn(db, 'select').mockImplementation(() => ({
        from: () => ({
          innerJoin: () => ({
            innerJoin: () => ({
              innerJoin: () => ({
                leftJoin: () => ({
                  where: () => ({
                    groupBy: () => ({
                      limit: () => Promise.resolve([]), // Not found under isPubliclyEligible!
                    }),
                  }),
                }),
              }),
            }),
          }),
        }),
      }));

      const res = await request(app).get('/api/providers/999');
      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('NOT_FOUND');
    });
  });
});
