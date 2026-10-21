import { eq, desc, sql, count, and, isNull, or, ilike } from 'drizzle-orm';
import { db } from '../../db/client.js';
import * as schema from '../../db/schema.js';
import { AppError } from '../../middleware/errorHandler.js';
import { getStorage } from '../../lib/storage/index.js';
import { env } from '../../config/env.js';
import { generateTemporaryPassword, hashPassword } from '../../lib/crypto.js';

export class AdminService {
  /**
   * List providers with pending verification documents.
   */
  static async getPendingProviders({ page = 1, limit = 20 }) {
    const offset = (page - 1) * limit;

    // Subquery or join for providers that have a document with status 'PENDING'
    const pendingDocs = await db
      .select({
        providerId: schema.providerVerificationDocuments.providerId,
        documentId: schema.providerVerificationDocuments.id,
        uploadedAt: schema.providerVerificationDocuments.uploadedAt,
      })
      .from(schema.providerVerificationDocuments)
      .where(eq(schema.providerVerificationDocuments.status, 'PENDING'))
      .orderBy(desc(schema.providerVerificationDocuments.uploadedAt))
      .limit(limit)
      .offset(offset);

    if (pendingDocs.length === 0) {
      return {
        data: [],
        pagination: {
          page,
          limit,
          total: 0,
          totalPages: 0,
        },
      };
    }

    const providerIds = [...new Set(pendingDocs.map((d) => d.providerId))];

    const providerList = await db
      .select({
        id: schema.providers.id,
        fullName: schema.providers.fullName,
        phone: schema.providers.phone,
        cityId: schema.providers.cityId,
        subCityId: schema.providers.subCityId,
        categoryId: schema.providers.categoryId,
        woreda: schema.providers.woreda,
        experienceYears: schema.providers.experienceYears,
        verificationStatus: schema.providers.verificationStatus,
        isActive: schema.providers.isActive,
        createdAt: schema.providers.createdAt,
      })
      .from(schema.providers)
      .where(sql`${schema.providers.id} IN (${sql.join(providerIds, sql`, `)})`);

    const [{ totalCount }] = await db
      .select({ totalCount: count() })
      .from(schema.providerVerificationDocuments)
      .where(eq(schema.providerVerificationDocuments.status, 'PENDING'));

    return {
      data: providerList,
      pagination: {
        page,
        limit,
        total: Number(totalCount),
        totalPages: Math.ceil(Number(totalCount) / limit) || 1,
      },
    };
  }

  /**
   * Get signed URL for the latest verification document of a provider.
   * Access is admin-only and writes an audit log entry.
   */
  static async getDocumentSignedUrl({ providerId, adminId, reason = 'Verification document review' }) {
    const storage = getStorage();

    const [provider] = await db
      .select({ id: schema.providers.id })
      .from(schema.providers)
      .where(eq(schema.providers.id, providerId))
      .limit(1);

    if (!provider) {
      throw new AppError(404, 'NOT_FOUND', 'Provider not found');
    }

    const [latestDoc] = await db
      .select()
      .from(schema.providerVerificationDocuments)
      .where(eq(schema.providerVerificationDocuments.providerId, providerId))
      .orderBy(desc(schema.providerVerificationDocuments.uploadedAt))
      .limit(1);

    if (!latestDoc) {
      throw new AppError(404, 'NOT_FOUND', 'No verification document found for this provider');
    }

    const ttlSeconds = env.ID_DOCUMENT_SIGNED_URL_TTL_SECONDS || 120;
    const signedUrl = await storage.getSignedUrl(latestDoc.objectKey, ttlSeconds);

    // Write audit log entry (spec §2 & Invariant #4)
    await db.insert(schema.adminAuditLog).values({
      adminId,
      action: 'DOCUMENT_ACCESS',
      targetType: 'PROVIDER_DOCUMENT',
      targetId: latestDoc.id,
      reason,
    });

    return {
      signedUrl,
      expiresInSeconds: ttlSeconds,
      status: latestDoc.status,
      uploadedAt: latestDoc.uploadedAt,
    };
  }

  /**
   * Transition verification status adhering strictly to spec §3.2 transition table.
   */
  static async transitionVerification({ providerId, targetStatus, rejectionReason, adminId }) {
    return await db.transaction(async (tx) => {
      const [provider] = await tx
        .select()
        .from(schema.providers)
        .where(eq(schema.providers.id, providerId))
        .limit(1);

      if (!provider) {
        throw new AppError(404, 'NOT_FOUND', 'Provider not found');
      }

      const currentStatus = provider.verificationStatus;

      // Validate transitions per spec §3.2 table:
      // Allowed admin transitions:
      // PENDING -> APPROVED
      // PENDING -> REJECTED
      // APPROVED -> REVOKED
      // REVOKED -> PENDING
      const isAllowed =
        (currentStatus === 'PENDING' && targetStatus === 'APPROVED') ||
        (currentStatus === 'PENDING' && targetStatus === 'REJECTED') ||
        (currentStatus === 'APPROVED' && targetStatus === 'REVOKED') ||
        (currentStatus === 'REVOKED' && targetStatus === 'PENDING');

      if (!isAllowed) {
        throw new AppError(
          409,
          'INVALID_TRANSITION',
          `Cannot transition verification status from ${currentStatus} to ${targetStatus}`
        );
      }

      const now = new Date();

      // 1. Transition: PENDING -> APPROVED
      if (currentStatus === 'PENDING' && targetStatus === 'APPROVED') {
        const [pendingDoc] = await tx
          .select()
          .from(schema.providerVerificationDocuments)
          .where(
            sql`${schema.providerVerificationDocuments.providerId} = ${providerId} AND ${schema.providerVerificationDocuments.status} = 'PENDING'`
          )
          .orderBy(desc(schema.providerVerificationDocuments.uploadedAt))
          .limit(1);

        if (!pendingDoc) {
          throw new AppError(
            409,
            'INVALID_STATE',
            'Cannot approve provider without an active PENDING document'
          );
        }

        await tx
          .update(schema.providerVerificationDocuments)
          .set({
            status: 'APPROVED',
            reviewedAt: now,
            reviewedBy: adminId,
          })
          .where(eq(schema.providerVerificationDocuments.id, pendingDoc.id));

        const [updatedProvider] = await tx
          .update(schema.providers)
          .set({
            verificationStatus: 'APPROVED',
            verificationReviewedAt: now,
            verificationReviewedBy: adminId,
            verificationRejectionReason: null,
          })
          .where(eq(schema.providers.id, providerId))
          .returning();

        await tx.insert(schema.adminAuditLog).values({
          adminId,
          action: 'VERIFICATION_APPROVED',
          targetType: 'PROVIDER',
          targetId: providerId,
          reason: 'Verification approved by admin',
        });

        return updatedProvider;
      }

      // 2. Transition: PENDING -> REJECTED
      if (currentStatus === 'PENDING' && targetStatus === 'REJECTED') {
        const [pendingDoc] = await tx
          .select()
          .from(schema.providerVerificationDocuments)
          .where(
            sql`${schema.providerVerificationDocuments.providerId} = ${providerId} AND ${schema.providerVerificationDocuments.status} = 'PENDING'`
          )
          .orderBy(desc(schema.providerVerificationDocuments.uploadedAt))
          .limit(1);

        if (pendingDoc) {
          await tx
            .update(schema.providerVerificationDocuments)
            .set({
              status: 'REJECTED',
              rejectionReason,
              reviewedAt: now,
              reviewedBy: adminId,
            })
            .where(eq(schema.providerVerificationDocuments.id, pendingDoc.id));
        }

        // Invariant #3: Rejecting sets isActive = false in the same transaction
        const [updatedProvider] = await tx
          .update(schema.providers)
          .set({
            verificationStatus: 'REJECTED',
            verificationRejectionReason: rejectionReason,
            verificationReviewedAt: now,
            verificationReviewedBy: adminId,
            isActive: false,
          })
          .where(eq(schema.providers.id, providerId))
          .returning();

        await tx.insert(schema.adminAuditLog).values({
          adminId,
          action: 'VERIFICATION_REJECTED',
          targetType: 'PROVIDER',
          targetId: providerId,
          reason: rejectionReason,
        });

        return updatedProvider;
      }

      // 3. Transition: APPROVED -> REVOKED
      if (currentStatus === 'APPROVED' && targetStatus === 'REVOKED') {
        const [approvedDoc] = await tx
          .select()
          .from(schema.providerVerificationDocuments)
          .where(
            sql`${schema.providerVerificationDocuments.providerId} = ${providerId} AND ${schema.providerVerificationDocuments.status} = 'APPROVED'`
          )
          .orderBy(desc(schema.providerVerificationDocuments.uploadedAt))
          .limit(1);

        if (approvedDoc) {
          await tx
            .update(schema.providerVerificationDocuments)
            .set({
              status: 'REVOKED',
              rejectionReason,
              reviewedAt: now,
              reviewedBy: adminId,
            })
            .where(eq(schema.providerVerificationDocuments.id, approvedDoc.id));
        }

        // Invariant #3: Revoking sets isActive = false in the same transaction
        const [updatedProvider] = await tx
          .update(schema.providers)
          .set({
            verificationStatus: 'REVOKED',
            verificationRejectionReason: rejectionReason,
            verificationReviewedAt: now,
            verificationReviewedBy: adminId,
            isActive: false,
          })
          .where(eq(schema.providers.id, providerId))
          .returning();

        await tx.insert(schema.adminAuditLog).values({
          adminId,
          action: 'VERIFICATION_REVOKED',
          targetType: 'PROVIDER',
          targetId: providerId,
          reason: rejectionReason,
        });

        return updatedProvider;
      }

      // 4. Transition: REVOKED -> PENDING (Reopen)
      if (currentStatus === 'REVOKED' && targetStatus === 'PENDING') {
        const [updatedProvider] = await tx
          .update(schema.providers)
          .set({
            verificationStatus: 'PENDING',
            verificationReviewedAt: now,
            verificationReviewedBy: adminId,
          })
          .where(eq(schema.providers.id, providerId))
          .returning();

        await tx.insert(schema.adminAuditLog).values({
          adminId,
          action: 'VERIFICATION_REOPENED',
          targetType: 'PROVIDER',
          targetId: providerId,
          reason: rejectionReason || 'Reopened by admin for resubmission',
        });

        return updatedProvider;
      }
    });
  }

  /**
   * Update activation status (activate / suspend).
   */
  static async updateActivation({ providerId, isActive, reason, adminId }) {
    return await db.transaction(async (tx) => {
      const [provider] = await tx
        .select()
        .from(schema.providers)
        .where(eq(schema.providers.id, providerId))
        .limit(1);

      if (!provider) {
        throw new AppError(404, 'NOT_FOUND', 'Provider not found');
      }

      const now = new Date();

      if (isActive === true) {
        // Spec §3.3: Activate requires verificationStatus = 'APPROVED'; otherwise 409
        if (provider.verificationStatus !== 'APPROVED') {
          throw new AppError(
            409,
            'INVALID_STATE',
            'Cannot activate provider: provider must have verificationStatus APPROVED'
          );
        }

        const [updatedProvider] = await tx
          .update(schema.providers)
          .set({
            isActive: true,
            activatedAt: now,
            activatedBy: adminId,
            suspendedAt: null,
            suspendedBy: null,
            suspensionReason: null,
          })
          .where(eq(schema.providers.id, providerId))
          .returning();

        await tx.insert(schema.adminAuditLog).values({
          adminId,
          action: 'PROVIDER_ACTIVATED',
          targetType: 'PROVIDER',
          targetId: providerId,
          reason: 'Activated by admin',
        });

        return updatedProvider;
      } else {
        // Suspend
        const [updatedProvider] = await tx
          .update(schema.providers)
          .set({
            isActive: false,
            suspendedAt: now,
            suspendedBy: adminId,
            suspensionReason: reason,
          })
          .where(eq(schema.providers.id, providerId))
          .returning();

        await tx.insert(schema.adminAuditLog).values({
          adminId,
          action: 'PROVIDER_SUSPENDED',
          targetType: 'PROVIDER',
          targetId: providerId,
          reason,
        });

        return updatedProvider;
      }
    });
  }

  /**
   * Admin dashboard statistics
   */
  static async getStats() {
    const [providerCounts] = await db.select({
      total: count(),
      approved: count(sql`CASE WHEN ${schema.providers.verificationStatus} = 'APPROVED' THEN 1 END`),
      pending: count(sql`CASE WHEN ${schema.providers.verificationStatus} = 'PENDING' THEN 1 END`),
      rejected: count(sql`CASE WHEN ${schema.providers.verificationStatus} = 'REJECTED' THEN 1 END`),
      revoked: count(sql`CASE WHEN ${schema.providers.verificationStatus} = 'REVOKED' THEN 1 END`),
      active: count(sql`CASE WHEN ${schema.providers.isActive} = true THEN 1 END`),
      inactive: count(sql`CASE WHEN ${schema.providers.isActive} = false THEN 1 END`),
    }).from(schema.providers);

    const [callClicks] = await db.select({
      totalClicks: count(),
    }).from(schema.callLogs);

    return {
      providers: {
        total: Number(providerCounts.total),
        approved: Number(providerCounts.approved),
        pending: Number(providerCounts.pending),
        rejected: Number(providerCounts.rejected),
        revoked: Number(providerCounts.revoked),
        active: Number(providerCounts.active),
        inactive: Number(providerCounts.inactive),
      },
      totalCallClicks: Number(callClicks.totalClicks),
    };
  }

  /**
   * Admin-assisted provider password reset (spec §4.4)
   * 1. Check provider exists (else 404)
   * 2. Generate temporary password (>= 12 chars, crypto-based)
   * 3. Hash temporary password with bcrypt
   * 4. In a transaction:
   *    - Set provider passwordHash = hash, mustChangePassword = true, updatedAt = now
   *    - Revoke all active refresh tokens for this provider
   *    - Insert admin_audit_log entry (action: 'PROVIDER_PASSWORD_RESET', NEVER putting password in audit log or metadata!)
   * 5. Return temporary password ONCE to admin
   */
  static async resetProviderPassword({ providerId, reason, adminId }) {
    const [provider] = await db
      .select({
        id: schema.providers.id,
      })
      .from(schema.providers)
      .where(eq(schema.providers.id, providerId))
      .limit(1);

    if (!provider) {
      throw new AppError(404, 'NOT_FOUND', 'Provider not found');
    }

    const temporaryPassword = generateTemporaryPassword();
    const temporaryPasswordHash = await hashPassword(temporaryPassword);

    await db.transaction(async (tx) => {
      const now = new Date();

      // 1. Update provider with temporary password and mustChangePassword = true
      await tx
        .update(schema.providers)
        .set({
          passwordHash: temporaryPasswordHash,
          mustChangePassword: true,
          updatedAt: now,
        })
        .where(eq(schema.providers.id, providerId));

      // 2. Revoke all active refresh tokens for the provider
      await tx
        .update(schema.refreshTokens)
        .set({
          revokedAt: now,
        })
        .where(
          and(
            eq(schema.refreshTokens.providerId, providerId),
            isNull(schema.refreshTokens.revokedAt)
          )
        );

      // 3. Write audit log entry (NEVER log or store temporary password)
      await tx.insert(schema.adminAuditLog).values({
        adminId,
        action: 'PROVIDER_PASSWORD_RESET',
        targetType: 'PROVIDER',
        targetId: providerId,
        reason: reason || null,
        metadata: {
          providerId,
        },
      });
    });

    return { temporaryPassword };
  }

  /**
   * Admin review moderation (spec §6.6)
   * Sets HIDDEN/PUBLISHED with reason; never edits author rating or text.
   * Runs in transaction with audit log entry.
   */
  static async moderateReview({ reviewId, status, reason, adminId }) {
    return await db.transaction(async (tx) => {
      const [review] = await tx
        .select()
        .from(schema.providerReviews)
        .where(eq(schema.providerReviews.id, reviewId))
        .limit(1);

      if (!review) {
        throw new AppError(404, 'NOT_FOUND', 'Review not found');
      }

      const now = new Date();
      const [updated] = await tx
        .update(schema.providerReviews)
        .set({
          status,
          moderatedBy: adminId,
          moderatedAt: now,
          moderationReason: reason,
          updatedAt: now,
        })
        .where(eq(schema.providerReviews.id, reviewId))
        .returning();

      await tx.insert(schema.adminAuditLog).values({
        adminId,
        action: 'REVIEW_MODERATION',
        targetType: 'REVIEW',
        targetId: reviewId,
        reason,
        metadata: {
          previousStatus: review.status,
          newStatus: status,
        },
      });

      return updated;
    });
  }

  /**
   * List phone change requests (spec §6.6)
   */
  static async getPhoneChangeRequests({ page = 1, limit = 20, status = 'PENDING' }) {
    const offset = (page - 1) * limit;

    const requests = await db
      .select({
        id: schema.phoneChangeRequests.id,
        providerId: schema.phoneChangeRequests.providerId,
        providerName: schema.providers.fullName,
        currentPhone: schema.providers.phone,
        requestedPhone: schema.phoneChangeRequests.newPhone,
        reason: schema.phoneChangeRequests.reason,
        status: schema.phoneChangeRequests.status,
        rejectionReason: schema.phoneChangeRequests.rejectionReason,
        createdAt: schema.phoneChangeRequests.createdAt,
        reviewedAt: schema.phoneChangeRequests.reviewedAt,
      })
      .from(schema.phoneChangeRequests)
      .innerJoin(schema.providers, eq(schema.phoneChangeRequests.providerId, schema.providers.id))
      .where(eq(schema.phoneChangeRequests.status, status))
      .orderBy(desc(schema.phoneChangeRequests.createdAt), desc(schema.phoneChangeRequests.id))
      .limit(limit)
      .offset(offset);

    const [{ total }] = await db
      .select({ total: count() })
      .from(schema.phoneChangeRequests)
      .where(eq(schema.phoneChangeRequests.status, status));

    const totalCount = Number(total);

    return {
      data: requests,
      pagination: {
        page,
        limit,
        total: totalCount,
        totalPages: Math.ceil(totalCount / limit) || 1,
      },
    };
  }

  /**
   * Decide phone change request (spec §4.5, §6.6)
   */
  static async decidePhoneChangeRequest({ requestId, status, rejectionReason, adminId }) {
    const [request] = await db
      .select()
      .from(schema.phoneChangeRequests)
      .where(eq(schema.phoneChangeRequests.id, requestId))
      .limit(1);

    if (!request) {
      throw new AppError(404, 'NOT_FOUND', 'Phone change request not found');
    }

    if (request.status !== 'PENDING') {
      throw new AppError(
        409,
        'INVALID_STATE',
        `Only pending requests can be decided (current: ${request.status})`
      );
    }

    const now = new Date();

    if (status === 'APPROVED') {
      // Re-check uniqueness at approval time
      const [duplicate] = await db
        .select({ id: schema.providers.id })
        .from(schema.providers)
        .where(eq(schema.providers.phone, request.newPhone))
        .limit(1);

      if (duplicate) {
        throw new AppError(
          409,
          'DUPLICATE_PHONE',
          'Phone number is already registered by another provider'
        );
      }

      return await db.transaction(async (tx) => {
        // 1. Update provider's phone
        await tx
          .update(schema.providers)
          .set({
            phone: request.newPhone,
            updatedAt: now,
          })
          .where(eq(schema.providers.id, request.providerId));

        // 2. Mark request APPROVED
        const [updatedRequest] = await tx
          .update(schema.phoneChangeRequests)
          .set({
            status: 'APPROVED',
            reviewedBy: adminId,
            reviewedAt: now,
          })
          .where(eq(schema.phoneChangeRequests.id, requestId))
          .returning();

        // 3. Revoke all refresh families for this provider
        await tx
          .update(schema.refreshTokens)
          .set({
            revokedAt: now,
          })
          .where(
            and(
              eq(schema.refreshTokens.providerId, request.providerId),
              isNull(schema.refreshTokens.revokedAt)
            )
          );

        // 4. Write audit log entry (target is the request ID)
        await tx.insert(schema.adminAuditLog).values({
          adminId,
          action: 'PHONE_CHANGE_APPROVAL',
          targetType: 'PHONE_CHANGE_REQUEST',
          targetId: requestId,
          reason: null,
          metadata: {
            providerId: request.providerId,
            requestedPhone: request.newPhone,
          },
        });

        return updatedRequest;
      });
    } else {
      // Rejection
      return await db.transaction(async (tx) => {
        const [updatedRequest] = await tx
          .update(schema.phoneChangeRequests)
          .set({
            status: 'REJECTED',
            rejectionReason,
            reviewedBy: adminId,
            reviewedAt: now,
          })
          .where(eq(schema.phoneChangeRequests.id, requestId))
          .returning();

        await tx.insert(schema.adminAuditLog).values({
          adminId,
          action: 'PHONE_CHANGE_REJECTION',
          targetType: 'PHONE_CHANGE_REQUEST',
          targetId: requestId,
          reason: rejectionReason,
          metadata: {
            providerId: request.providerId,
            requestedPhone: request.newPhone,
          },
        });

        return updatedRequest;
      });
    }
  }

  /**
   * List all providers with admin filters (status, isActive, category, search).
   */
  static async getProviders({
    page = 1,
    limit = 20,
    status = 'ALL',
    isActive = 'ALL',
    categoryId,
    search,
  }) {
    const offset = (page - 1) * limit;
    const conditions = [];

    if (status !== 'ALL') {
      conditions.push(eq(schema.providers.verificationStatus, status));
    }
    if (isActive !== 'ALL') {
      conditions.push(eq(schema.providers.isActive, isActive === 'true'));
    }
    if (categoryId) {
      conditions.push(eq(schema.providers.categoryId, categoryId));
    }
    if (search) {
      conditions.push(
        or(
          ilike(schema.providers.fullName, `%${search}%`),
          ilike(schema.providers.phone, `%${search}%`)
        )
      );
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const rows = await db
      .select({
        id: schema.providers.id,
        fullName: schema.providers.fullName,
        phone: schema.providers.phone,
        bio: schema.providers.bio,
        experienceYears: schema.providers.experienceYears,
        avatarUrl: schema.providers.avatarUrl,
        workSamples: schema.providers.workSamples,
        woreda: schema.providers.woreda,
        mustChangePassword: schema.providers.mustChangePassword,
        verificationStatus: schema.providers.verificationStatus,
        verificationRejectionReason: schema.providers.verificationRejectionReason,
        verificationReviewedAt: schema.providers.verificationReviewedAt,
        isActive: schema.providers.isActive,
        activatedAt: schema.providers.activatedAt,
        suspendedAt: schema.providers.suspendedAt,
        suspensionReason: schema.providers.suspensionReason,
        isAvailable: schema.providers.isAvailable,
        createdAt: schema.providers.createdAt,
        updatedAt: schema.providers.updatedAt,
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
      .where(whereClause)
      .groupBy(
        schema.providers.id,
        schema.categories.id,
        schema.cities.id,
        schema.subCities.id
      )
      .orderBy(desc(schema.providers.createdAt))
      .limit(limit)
      .offset(offset);

    const [{ totalCount }] = await db
      .select({ totalCount: count() })
      .from(schema.providers)
      .where(whereClause);

    return {
      data: rows,
      pagination: {
        page,
        limit,
        total: Number(totalCount),
        totalPages: Math.ceil(Number(totalCount) / limit) || 1,
      },
    };
  }

  /**
   * Get single provider details for admin (regardless of verification or active status).
   */
  static async getProviderById(providerId) {
    const [row] = await db
      .select({
        id: schema.providers.id,
        fullName: schema.providers.fullName,
        phone: schema.providers.phone,
        bio: schema.providers.bio,
        experienceYears: schema.providers.experienceYears,
        avatarUrl: schema.providers.avatarUrl,
        workSamples: schema.providers.workSamples,
        woreda: schema.providers.woreda,
        mustChangePassword: schema.providers.mustChangePassword,
        verificationStatus: schema.providers.verificationStatus,
        verificationRejectionReason: schema.providers.verificationRejectionReason,
        verificationReviewedAt: schema.providers.verificationReviewedAt,
        isActive: schema.providers.isActive,
        activatedAt: schema.providers.activatedAt,
        suspendedAt: schema.providers.suspendedAt,
        suspensionReason: schema.providers.suspensionReason,
        isAvailable: schema.providers.isAvailable,
        createdAt: schema.providers.createdAt,
        updatedAt: schema.providers.updatedAt,
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
      .where(eq(schema.providers.id, providerId))
      .groupBy(
        schema.providers.id,
        schema.categories.id,
        schema.cities.id,
        schema.subCities.id
      )
      .limit(1);

    if (!row) {
      throw new AppError(404, 'NOT_FOUND', 'Provider not found');
    }

    return row;
  }

  /**
   * List reviews for admin with moderation and report status.
   */
  static async getReviews({
    page = 1,
    limit = 20,
    status = 'ALL',
    reportedOnly = 'false',
    providerId,
  }) {
    const offset = (page - 1) * limit;
    const conditions = [];

    if (status !== 'ALL') {
      conditions.push(eq(schema.providerReviews.status, status));
    }
    if (providerId) {
      conditions.push(eq(schema.providerReviews.providerId, providerId));
    }

    const reportsCountSql = sql`COUNT(DISTINCT ${schema.reviewReports.id})::int`;
    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const baseQuery = db
      .select({
        id: schema.providerReviews.id,
        providerId: schema.providerReviews.providerId,
        providerName: schema.providers.fullName,
        customerId: schema.providerReviews.customerId,
        customerName: schema.customerUsers.fullName,
        rating: schema.providerReviews.rating,
        comment: schema.providerReviews.comment,
        status: schema.providerReviews.status,
        moderatedAt: schema.providerReviews.moderatedAt,
        moderationReason: schema.providerReviews.moderationReason,
        createdAt: schema.providerReviews.createdAt,
        updatedAt: schema.providerReviews.updatedAt,
        reportCount: reportsCountSql,
      })
      .from(schema.providerReviews)
      .innerJoin(schema.providers, eq(schema.providerReviews.providerId, schema.providers.id))
      .innerJoin(schema.customerUsers, eq(schema.providerReviews.customerId, schema.customerUsers.id))
      .leftJoin(schema.reviewReports, eq(schema.providerReviews.id, schema.reviewReports.reviewId))
      .groupBy(
        schema.providerReviews.id,
        schema.providers.id,
        schema.customerUsers.id
      );

    if (whereClause) {
      baseQuery.where(whereClause);
    }

    if (reportedOnly === 'true') {
      baseQuery.having(sql`COUNT(${schema.reviewReports.id}) > 0`);
    }

    const rows = await baseQuery
      .orderBy(desc(schema.providerReviews.createdAt))
      .limit(limit)
      .offset(offset);

    let total = 0;
    if (reportedOnly === 'true') {
      const allReported = await db
        .select({ id: schema.providerReviews.id })
        .from(schema.providerReviews)
        .innerJoin(schema.reviewReports, eq(schema.providerReviews.id, schema.reviewReports.reviewId))
        .where(whereClause)
        .groupBy(schema.providerReviews.id);
      total = allReported.length;
    } else {
      const [{ countValue }] = await db
        .select({ countValue: count() })
        .from(schema.providerReviews)
        .where(whereClause);
      total = Number(countValue);
    }

    return {
      data: rows,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  }

  /**
   * Reference data: Create Category
   */
  static async createCategory({ nameEn, nameAm, slug, iconName, displayOrder, adminId }) {
    const existing = await db
      .select({ id: schema.categories.id })
      .from(schema.categories)
      .where(eq(schema.categories.slug, slug))
      .limit(1);

    if (existing.length > 0) {
      throw new AppError(409, 'DUPLICATE_SLUG', 'Category with this slug already exists');
    }

    const [created] = await db
      .insert(schema.categories)
      .values({
        nameEn,
        nameAm,
        slug,
        iconName,
        displayOrder,
      })
      .returning();

    await db.insert(schema.adminAuditLog).values({
      adminId,
      action: 'CREATE_CATEGORY',
      targetType: 'CATEGORY',
      targetId: created.id,
      reason: null,
    });

    return created;
  }

  /**
   * Reference data: Update Category
   */
  static async updateCategory({ categoryId, data, adminId }) {
    const [existing] = await db
      .select()
      .from(schema.categories)
      .where(eq(schema.categories.id, categoryId))
      .limit(1);

    if (!existing) {
      throw new AppError(404, 'NOT_FOUND', 'Category not found');
    }

    const [updated] = await db
      .update(schema.categories)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(eq(schema.categories.id, categoryId))
      .returning();

    await db.insert(schema.adminAuditLog).values({
      adminId,
      action: 'UPDATE_CATEGORY',
      targetType: 'CATEGORY',
      targetId: categoryId,
      reason: null,
    });

    return updated;
  }

  /**
   * Reference data: Create City
   */
  static async createCity({ nameEn, nameAm, slug, adminId }) {
    const existing = await db
      .select({ id: schema.cities.id })
      .from(schema.cities)
      .where(eq(schema.cities.slug, slug))
      .limit(1);

    if (existing.length > 0) {
      throw new AppError(409, 'DUPLICATE_SLUG', 'City with this slug already exists');
    }

    const [created] = await db
      .insert(schema.cities)
      .values({
        nameEn,
        nameAm,
        slug,
      })
      .returning();

    await db.insert(schema.adminAuditLog).values({
      adminId,
      action: 'CREATE_CITY',
      targetType: 'CITY',
      targetId: created.id,
      reason: null,
    });

    return created;
  }

  /**
   * Reference data: Update City
   */
  static async updateCity({ cityId, data, adminId }) {
    const [existing] = await db
      .select()
      .from(schema.cities)
      .where(eq(schema.cities.id, cityId))
      .limit(1);

    if (!existing) {
      throw new AppError(404, 'NOT_FOUND', 'City not found');
    }

    const [updated] = await db
      .update(schema.cities)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(eq(schema.cities.id, cityId))
      .returning();

    await db.insert(schema.adminAuditLog).values({
      adminId,
      action: 'UPDATE_CITY',
      targetType: 'CITY',
      targetId: cityId,
      reason: null,
    });

    return updated;
  }

  /**
   * Reference data: Create Sub-City
   */
  static async createSubCity({ cityId, nameEn, nameAm, slug, adminId }) {
    const [city] = await db
      .select()
      .from(schema.cities)
      .where(eq(schema.cities.id, cityId))
      .limit(1);

    if (!city) {
      throw new AppError(404, 'NOT_FOUND', 'Parent city not found');
    }

    const existing = await db
      .select({ id: schema.subCities.id })
      .from(schema.subCities)
      .where(and(eq(schema.subCities.cityId, cityId), eq(schema.subCities.slug, slug)))
      .limit(1);

    if (existing.length > 0) {
      throw new AppError(409, 'DUPLICATE_SLUG', 'Sub-city with this slug already exists in this city');
    }

    const [created] = await db
      .insert(schema.subCities)
      .values({
        cityId,
        nameEn,
        nameAm,
        slug,
      })
      .returning();

    await db.insert(schema.adminAuditLog).values({
      adminId,
      action: 'CREATE_SUB_CITY',
      targetType: 'SUB_CITY',
      targetId: created.id,
      reason: null,
    });

    return created;
  }

  /**
   * Reference data: Update Sub-City
   */
  static async updateSubCity({ subCityId, data, adminId }) {
    const [existing] = await db
      .select()
      .from(schema.subCities)
      .where(eq(schema.subCities.id, subCityId))
      .limit(1);

    if (!existing) {
      throw new AppError(404, 'NOT_FOUND', 'Sub-city not found');
    }

    const [updated] = await db
      .update(schema.subCities)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(eq(schema.subCities.id, subCityId))
      .returning();

    await db.insert(schema.adminAuditLog).values({
      adminId,
      action: 'UPDATE_SUB_CITY',
      targetType: 'SUB_CITY',
      targetId: subCityId,
      reason: null,
    });

    return updated;
  }
}
