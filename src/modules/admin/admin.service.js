import { eq, desc, sql, count, and, isNull } from 'drizzle-orm';
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
}
