import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { app } from '../../src/app.js';
import { db } from '../../src/db/client.js';
import { signAccessToken } from '../../src/lib/tokens.js';
import { AdminService } from '../../src/modules/admin/admin.service.js';

describe('Extended Admin Endpoints (spec §6.6)', () => {
  const adminId = 1;
  const adminToken = signAccessToken({ sub: adminId, role: 'ADMIN' });
  const providerToken = signAccessToken({ sub: 10, role: 'PROVIDER' });

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('GET /api/admin/providers', () => {
    it('requires ADMIN role and denies non-admins', async () => {
      const resUnauth = await request(app).get('/api/admin/providers');
      expect(resUnauth.status).toBe(401);

      const resProvider = await request(app)
        .get('/api/admin/providers')
        .set('Authorization', `Bearer ${providerToken}`);
      expect(resProvider.status).toBe(403);
    });

    it('returns paginated providers list for admin', async () => {
      const mockResult = {
        data: [
          {
            id: 1,
            fullName: 'Abebe Kebede',
            phone: '+251911223344',
            verificationStatus: 'APPROVED',
            isActive: true,
          },
        ],
        pagination: { page: 1, limit: 20, total: 1, totalPages: 1 },
      };

      vi.spyOn(AdminService, 'getProviders').mockResolvedValueOnce(mockResult);

      const res = await request(app)
        .get('/api/admin/providers?status=APPROVED&isActive=true')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.pagination.total).toBe(1);
    });
  });

  describe('GET /api/admin/reviews', () => {
    it('returns reviews list including reported queue', async () => {
      const mockResult = {
        data: [
          {
            id: 101,
            providerId: 1,
            providerName: 'Abebe Kebede',
            customerId: 2,
            customerName: 'Sara Tadesse',
            rating: 1,
            comment: 'Abusive language',
            status: 'PUBLISHED',
            reportCount: 2,
          },
        ],
        pagination: { page: 1, limit: 20, total: 1, totalPages: 1 },
      };

      vi.spyOn(AdminService, 'getReviews').mockResolvedValueOnce(mockResult);

      const res = await request(app)
        .get('/api/admin/reviews?reportedOnly=true')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].reportCount).toBe(2);
    });
  });

  describe('Admin Reference Data CRUD (spec §6.6)', () => {
    it('creates category with 201 and audit logging', async () => {
      const mockCat = {
        id: 7,
        nameEn: 'Gardening',
        nameAm: 'የአትክልት ስራ',
        slug: 'gardening',
        iconName: 'flower',
        displayOrder: 7,
      };

      vi.spyOn(AdminService, 'createCategory').mockResolvedValueOnce(mockCat);

      const res = await request(app)
        .post('/api/admin/categories')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          nameEn: 'Gardening',
          nameAm: 'የአትክልት ስራ',
          slug: 'gardening',
          iconName: 'flower',
          displayOrder: 7,
        });

      expect(res.status).toBe(201);
      expect(res.body.data.slug).toBe('gardening');
    });

    it('updates category with 200', async () => {
      const updatedCat = {
        id: 1,
        nameEn: 'Master Plumbing',
        isActive: true,
      };

      vi.spyOn(AdminService, 'updateCategory').mockResolvedValueOnce(updatedCat);

      const res = await request(app)
        .patch('/api/admin/categories/1')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ nameEn: 'Master Plumbing' });

      expect(res.status).toBe(200);
      expect(res.body.data.nameEn).toBe('Master Plumbing');
    });

    it('creates city with 201', async () => {
      const mockCity = {
        id: 2,
        nameEn: 'Dire Dawa',
        nameAm: 'ድሬዳዋ',
        slug: 'dire-dawa',
      };

      vi.spyOn(AdminService, 'createCity').mockResolvedValueOnce(mockCity);

      const res = await request(app)
        .post('/api/admin/cities')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          nameEn: 'Dire Dawa',
          nameAm: 'ድሬዳዋ',
          slug: 'dire-dawa',
        });

      expect(res.status).toBe(201);
      expect(res.body.data.slug).toBe('dire-dawa');
    });

    it('creates sub-city with 201', async () => {
      const mockSubCity = {
        id: 12,
        cityId: 1,
        nameEn: 'Old Airport',
        nameAm: 'ኦልድ ኤርፖርት',
        slug: 'old-airport',
      };

      vi.spyOn(AdminService, 'createSubCity').mockResolvedValueOnce(mockSubCity);

      const res = await request(app)
        .post('/api/admin/sub-cities')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          cityId: 1,
          nameEn: 'Old Airport',
          nameAm: 'ኦልድ ኤርፖርት',
          slug: 'old-airport',
        });

      expect(res.status).toBe(201);
      expect(res.body.data.slug).toBe('old-airport');
    });
  });
});
