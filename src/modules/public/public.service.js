import { eq, and, sql, count, asc, desc } from 'drizzle-orm';
import { db } from '../../db/client.js';
import * as schema from '../../db/schema.js';
import { AppError } from '../../middleware/errorHandler.js';

export class PublicService {
  /**
   * List active categories ordered by displayOrder.
   */
  static async getCategories() {
    return await db
      .select({
        id: schema.categories.id,
        nameEn: schema.categories.nameEn,
        nameAm: schema.categories.nameAm,
        slug: schema.categories.slug,
        iconName: schema.categories.iconName,
        displayOrder: schema.categories.displayOrder,
      })
      .from(schema.categories)
      .where(eq(schema.categories.isActive, true))
      .orderBy(asc(schema.categories.displayOrder));
  }

  /**
   * List active cities with nested active sub-cities.
   */
  static async getLocations() {
    const activeCities = await db
      .select({
        id: schema.cities.id,
        nameEn: schema.cities.nameEn,
        nameAm: schema.cities.nameAm,
        slug: schema.cities.slug,
      })
      .from(schema.cities)
      .where(eq(schema.cities.isActive, true));

    const activeSubCities = await db
      .select({
        id: schema.subCities.id,
        cityId: schema.subCities.cityId,
        nameEn: schema.subCities.nameEn,
        nameAm: schema.subCities.nameAm,
        slug: schema.subCities.slug,
      })
      .from(schema.subCities)
      .where(eq(schema.subCities.isActive, true));

    return activeCities.map((city) => ({
      ...city,
      subCities: activeSubCities
        .filter((sub) => sub.cityId === city.id)
        .map(({ cityId: _cid, ...sub }) => sub),
    }));
  }

  /**
   * Public provider directory search using shared eligibility helper (Invariant #1).
   */
  static async getProviders({
    categoryId,
    cityId,
    subCityId,
    availableOnly = false,
    page = 1,
    limit = 20,
  }) {
    const offset = (page - 1) * limit;

    // Conditions starting with Invariant #1: isPubliclyEligible
    const conditions = [schema.isPubliclyEligible];

    if (categoryId) conditions.push(eq(schema.providers.categoryId, categoryId));
    if (cityId) conditions.push(eq(schema.providers.cityId, cityId));
    if (subCityId) conditions.push(eq(schema.providers.subCityId, subCityId));
    if (availableOnly) conditions.push(eq(schema.providers.isAvailable, true));

    const whereClause = and(...conditions);

    // Explicit projection of public columns (Invariant #8)
    const providerRows = await db
      .select({
        id: schema.providers.id,
        fullName: schema.providers.fullName,
        phone: schema.providers.phone,
        bio: schema.providers.bio,
        experienceYears: schema.providers.experienceYears,
        avatarUrl: schema.providers.avatarUrl,
        workSamples: schema.providers.workSamples,
        isAvailable: schema.providers.isAvailable,
        woreda: schema.providers.woreda,
        // Category details
        category: {
          id: schema.categories.id,
          nameEn: schema.categories.nameEn,
          nameAm: schema.categories.nameAm,
          slug: schema.categories.slug,
          iconName: schema.categories.iconName,
        },
        // City details
        city: {
          id: schema.cities.id,
          nameEn: schema.cities.nameEn,
          nameAm: schema.cities.nameAm,
        },
        // Sub-city details
        subCity: {
          id: schema.subCities.id,
          nameEn: schema.subCities.nameEn,
          nameAm: schema.subCities.nameAm,
        },
        // Review summaries (published only)
        reviewStats: {
          averageRating: sql`COALESCE(AVG(CASE WHEN ${schema.providerReviews.status} = 'PUBLISHED' THEN ${schema.providerReviews.rating} END), 0)::float`,
          reviewCount: sql`COUNT(CASE WHEN ${schema.providerReviews.status} = 'PUBLISHED' THEN 1 END)::int`,
        },
      })
      .from(schema.providers)
      .innerJoin(schema.categories, eq(schema.providers.categoryId, schema.categories.id))
      .innerJoin(schema.cities, eq(schema.providers.cityId, schema.cities.id))
      .innerJoin(schema.subCities, eq(schema.providers.subCityId, schema.subCities.id))
      .leftJoin(schema.providerReviews, eq(schema.providers.id, schema.providerReviews.providerId))
      .where(whereClause)
      .groupBy(
        schema.providers.id,
        schema.categories.id,
        schema.cities.id,
        schema.subCities.id
      )
      .limit(limit)
      .offset(offset);

    const [{ totalCount }] = await db
      .select({ totalCount: count() })
      .from(schema.providers)
      .where(whereClause);

    const formattedData = providerRows.map((row) => ({
      id: row.id,
      fullName: row.fullName,
      phone: row.phone,
      bio: row.bio,
      experienceYears: row.experienceYears,
      avatarUrl: row.avatarUrl,
      workSamples: row.workSamples,
      isAvailable: row.isAvailable,
      category: row.category,
      location: {
        city: row.city,
        subCity: {
          ...row.subCity,
          woreda: row.woreda,
        },
      },
      averageRating: row.reviewStats?.reviewCount > 0 ? Number(row.reviewStats.averageRating.toFixed(1)) : null,
      reviewCount: Number(row.reviewStats?.reviewCount || 0),
    }));

    return {
      data: formattedData,
      pagination: {
        page,
        limit,
        total: Number(totalCount),
        totalPages: Math.ceil(Number(totalCount) / limit) || 1,
      },
    };
  }

  /**
   * Get single eligible provider details (Invariant #1).
   */
  static async getProviderById(id) {
    const [row] = await db
      .select({
        id: schema.providers.id,
        fullName: schema.providers.fullName,
        phone: schema.providers.phone,
        bio: schema.providers.bio,
        experienceYears: schema.providers.experienceYears,
        avatarUrl: schema.providers.avatarUrl,
        workSamples: schema.providers.workSamples,
        isAvailable: schema.providers.isAvailable,
        woreda: schema.providers.woreda,
        category: {
          id: schema.categories.id,
          nameEn: schema.categories.nameEn,
          nameAm: schema.categories.nameAm,
          slug: schema.categories.slug,
          iconName: schema.categories.iconName,
        },
        city: {
          id: schema.cities.id,
          nameEn: schema.cities.nameEn,
          nameAm: schema.cities.nameAm,
        },
        subCity: {
          id: schema.subCities.id,
          nameEn: schema.subCities.nameEn,
          nameAm: schema.subCities.nameAm,
        },
        reviewStats: {
          averageRating: sql`COALESCE(AVG(CASE WHEN ${schema.providerReviews.status} = 'PUBLISHED' THEN ${schema.providerReviews.rating} END), 0)::float`,
          reviewCount: sql`COUNT(CASE WHEN ${schema.providerReviews.status} = 'PUBLISHED' THEN 1 END)::int`,
        },
      })
      .from(schema.providers)
      .innerJoin(schema.categories, eq(schema.providers.categoryId, schema.categories.id))
      .innerJoin(schema.cities, eq(schema.providers.cityId, schema.cities.id))
      .innerJoin(schema.subCities, eq(schema.providers.subCityId, schema.subCities.id))
      .leftJoin(schema.providerReviews, eq(schema.providers.id, schema.providerReviews.providerId))
      .where(and(eq(schema.providers.id, id), schema.isPubliclyEligible)) // Invariant #1
      .groupBy(
        schema.providers.id,
        schema.categories.id,
        schema.cities.id,
        schema.subCities.id
      )
      .limit(1);

    if (!row) {
      throw new AppError(404, 'NOT_FOUND', 'Provider not found or ineligible');
    }

    return {
      id: row.id,
      fullName: row.fullName,
      phone: row.phone,
      bio: row.bio,
      experienceYears: row.experienceYears,
      avatarUrl: row.avatarUrl,
      workSamples: row.workSamples,
      isAvailable: row.isAvailable,
      category: row.category,
      location: {
        city: row.city,
        subCity: {
          ...row.subCity,
          woreda: row.woreda,
        },
      },
      averageRating: row.reviewStats?.reviewCount > 0 ? Number(row.reviewStats.averageRating.toFixed(1)) : null,
      reviewCount: Number(row.reviewStats?.reviewCount || 0),
    };
  }

  /**
   * Public paginated list of published reviews for an eligible provider (spec §6.3)
   */
  static async getProviderReviews({ providerId, page = 1, limit = 20 }) {
    // 1. Invariant #1: provider must be eligible
    const [provider] = await db
      .select({ id: schema.providers.id })
      .from(schema.providers)
      .where(and(eq(schema.providers.id, providerId), schema.isPubliclyEligible))
      .limit(1);

    if (!provider) {
      throw new AppError(404, 'NOT_FOUND', 'Provider not found or ineligible');
    }

    const offset = (page - 1) * limit;

    const reviews = await db
      .select({
        id: schema.providerReviews.id,
        rating: schema.providerReviews.rating,
        comment: schema.providerReviews.comment,
        createdAt: schema.providerReviews.createdAt,
        reviewerName: schema.customerUsers.fullName,
      })
      .from(schema.providerReviews)
      .innerJoin(
        schema.customerUsers,
        eq(schema.providerReviews.customerId, schema.customerUsers.id)
      )
      .where(
        and(
          eq(schema.providerReviews.providerId, providerId),
          eq(schema.providerReviews.status, 'PUBLISHED')
        )
      )
      .orderBy(desc(schema.providerReviews.createdAt), desc(schema.providerReviews.id))
      .limit(limit)
      .offset(offset);

    const [{ total }] = await db
      .select({ total: count() })
      .from(schema.providerReviews)
      .where(
        and(
          eq(schema.providerReviews.providerId, providerId),
          eq(schema.providerReviews.status, 'PUBLISHED')
        )
      );

    const totalCount = Number(total);

    return {
      data: reviews,
      pagination: {
        page,
        limit,
        total: totalCount,
        totalPages: Math.ceil(totalCount / limit) || 1,
      },
    };
  }
}
