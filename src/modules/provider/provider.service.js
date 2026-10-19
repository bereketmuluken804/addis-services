import crypto from 'node:crypto';
import { eq, and, count, isNull, desc } from 'drizzle-orm';
import { db } from '../../db/client.js';
import * as schema from '../../db/schema.js';
import { AppError } from '../../middleware/errorHandler.js';
import { getStorage } from '../../lib/storage/index.js';
import { comparePassword, hashPassword } from '../../lib/crypto.js';
import { normalizePhone } from '../../lib/phone.js';
import { AuthService } from '../auth/auth.service.js';

export class ProviderService {
  /**
   * Get provider profile with stats (calls received).
   */
  static async getProfile(providerId, cachedProvider = null) {
    const provider =
      cachedProvider ||
      (
        await db
          .select()
          .from(schema.providers)
          .where(eq(schema.providers.id, providerId))
          .limit(1)
      )[0];

    if (!provider) {
      throw new AppError(404, 'NOT_FOUND', 'Provider not found');
    }

    // Core metric: call-click events recorded
    const [{ totalCalls }] = await db
      .select({ totalCalls: count() })
      .from(schema.callLogs)
      .where(eq(schema.callLogs.providerId, providerId));

    const { passwordHash: _hash, ...safeProvider } = provider;

    return {
      ...safeProvider,
      totalCallsReceived: Number(totalCalls),
    };
  }

  /**
   * Update profile using an explicit allowlist.
   */
  static async updateProfile(providerId, data) {
    const [currentProvider] = await db
      .select()
      .from(schema.providers)
      .where(eq(schema.providers.id, providerId))
      .limit(1);

    if (!currentProvider) {
      throw new AppError(404, 'NOT_FOUND', 'Provider not found');
    }

    const cityId = data.cityId || currentProvider.cityId;
    const subCityId = data.subCityId || currentProvider.subCityId;
    const categoryId = data.categoryId || currentProvider.categoryId;

    // Validate category if updating
    if (data.categoryId) {
      const [category] = await db
        .select()
        .from(schema.categories)
        .where(and(eq(schema.categories.id, categoryId), eq(schema.categories.isActive, true)))
        .limit(1);

      if (!category) {
        throw new AppError(400, 'INVALID_CATEGORY', 'Selected category is invalid or inactive');
      }
    }

    // Validate city/sub-city relationship if updating either
    if (data.cityId || data.subCityId) {
      const [subCity] = await db
        .select()
        .from(schema.subCities)
        .where(
          and(
            eq(schema.subCities.id, subCityId),
            eq(schema.subCities.cityId, cityId),
            eq(schema.subCities.isActive, true)
          )
        )
        .limit(1);

      if (!subCity) {
        throw new AppError(
          400,
          'INVALID_LOCATION',
          'Selected sub-city is invalid, inactive, or does not belong to the selected city'
        );
      }
    }

    const [updated] = await db
      .update(schema.providers)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(eq(schema.providers.id, providerId))
      .returning();

    const { passwordHash: _hash, ...safe } = updated;
    return safe;
  }

  /**
   * Update availability badge (only provider controls this).
   */
  static async updateAvailability(providerId, isAvailable) {
    const [updated] = await db
      .update(schema.providers)
      .set({
        isAvailable,
        updatedAt: new Date(),
      })
      .where(eq(schema.providers.id, providerId))
      .returning();

    if (!updated) {
      throw new AppError(404, 'NOT_FOUND', 'Provider not found');
    }

    return {
      isAvailable: updated.isAvailable,
    };
  }

  /**
   * Resubmit ID document adhering to spec §7:
   * Allowed iff verificationStatus is REJECTED or PENDING and no document row has status='PENDING'.
   */
  static async resubmitDocument(providerId, file, cachedProvider = null) {
    const storage = getStorage();

    const provider =
      cachedProvider ||
      (
        await db
          .select()
          .from(schema.providers)
          .where(eq(schema.providers.id, providerId))
          .limit(1)
      )[0];

    if (!provider) {
      throw new AppError(404, 'NOT_FOUND', 'Provider not found');
    }

    // Resubmission rule: allowed iff verificationStatus is REJECTED or PENDING
    if (provider.verificationStatus !== 'REJECTED' && provider.verificationStatus !== 'PENDING') {
      throw new AppError(
        409,
        'INVALID_STATE',
        `Document resubmission not allowed when status is ${provider.verificationStatus}`
      );
    }

    // Check if there is already an open PENDING document
    const [openPendingDoc] = await db
      .select()
      .from(schema.providerVerificationDocuments)
      .where(
        and(
          eq(schema.providerVerificationDocuments.providerId, providerId),
          eq(schema.providerVerificationDocuments.status, 'PENDING')
        )
      )
      .limit(1);

    if (openPendingDoc) {
      throw new AppError(
        409,
        'PENDING_DOCUMENT_EXISTS',
        'A verification document is already pending review'
      );
    }

    // Upload object to storage first
    const objectKey = `id-docs/${providerId}/${crypto.randomUUID()}.${file.verifiedExt || 'jpg'}`;
    await storage.upload({
      key: objectKey,
      buffer: file.buffer,
      contentType: file.verifiedMime || 'image/jpeg',
    });

    try {
      await db.transaction(async (tx) => {
        // Insert new document row
        await tx.insert(schema.providerVerificationDocuments).values({
          providerId,
          objectKey,
          status: 'PENDING',
        });

        // Set provider verification status to PENDING
        await tx
          .update(schema.providers)
          .set({
            verificationStatus: 'PENDING',
            verificationRejectionReason: null,
            updatedAt: new Date(),
          })
          .where(eq(schema.providers.id, providerId));
      });

      return {
        message: 'Verification document submitted successfully for review',
        status: 'PENDING',
      };
    } catch (err) {
      // Delete orphaned object on failed write
      await storage.delete(objectKey).catch(() => {});
      throw err;
    }
  }

  /**
   * Provider password change (spec §6.4)
   * 1. Validate current password matches stored hash (or temporary password)
   * 2. Hash new password
   * 3. In transaction: update hash, clear mustChangePassword, revoke active refresh tokens, issue fresh tokens
   */
  static async changePassword(providerId, { currentPassword, newPassword }) {
    const [provider] = await db
      .select()
      .from(schema.providers)
      .where(eq(schema.providers.id, providerId))
      .limit(1);

    if (!provider) {
      throw new AppError(404, 'NOT_FOUND', 'Provider not found');
    }

    const isMatch = await comparePassword(currentPassword, provider.passwordHash);
    if (!isMatch) {
      throw new AppError(401, 'INVALID_CREDENTIALS', 'Current password is incorrect');
    }

    const newPasswordHash = await hashPassword(newPassword);

    return await db.transaction(async (tx) => {
      const now = new Date();

      // 1. Update passwordHash and clear mustChangePassword
      await tx
        .update(schema.providers)
        .set({
          passwordHash: newPasswordHash,
          mustChangePassword: false,
          updatedAt: now,
        })
        .where(eq(schema.providers.id, providerId));

      // 2. Revoke all active refresh tokens for this provider
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

      // 3. Issue fresh tokens (new family)
      const tokens = await AuthService.issueTokens(tx, {
        ownerId: providerId,
        role: 'PROVIDER',
      });

      return tokens;
    });
  }

  /**
   * Submit phone change request (spec §4.5, §6.4)
   * 1. Validate password
   * 2. Normalize newPhone (422 if invalid)
   * 3. Cannot be identical to current phone
   * 4. Must not belong to any existing provider (409)
   * 5. Cannot have another PENDING request (409)
   */
  static async createPhoneChangeRequest({
    providerId,
    newPhone,
    currentPassword,
    reason,
    cachedProvider = null,
  }) {
    const provider =
      cachedProvider ||
      (
        await db
          .select()
          .from(schema.providers)
          .where(eq(schema.providers.id, providerId))
          .limit(1)
      )[0];

    if (!provider) {
      throw new AppError(404, 'NOT_FOUND', 'Provider not found');
    }

    // 1. Password verification
    const isPasswordValid = await comparePassword(currentPassword, provider.passwordHash);
    if (!isPasswordValid) {
      throw new AppError(401, 'INVALID_CREDENTIALS', 'Current password is incorrect');
    }

    // 2. Normalize new phone number (throws 422 INVALID_PHONE if malformed)
    const normalizedPhone = normalizePhone(newPhone);

    // 3. New phone cannot be identical to current phone
    if (normalizedPhone === provider.phone) {
      throw new AppError(
        400,
        'SAME_PHONE',
        'New phone number cannot be the same as current phone number'
      );
    }

    // 4. Must not already belong to any provider
    const [existingWithPhone] = await db
      .select({ id: schema.providers.id })
      .from(schema.providers)
      .where(eq(schema.providers.phone, normalizedPhone))
      .limit(1);

    if (existingWithPhone) {
      throw new AppError(
        409,
        'DUPLICATE_PHONE',
        'Phone number is already registered by a provider'
      );
    }

    // 5. At most one PENDING request per provider
    const [existingPending] = await db
      .select({ id: schema.phoneChangeRequests.id })
      .from(schema.phoneChangeRequests)
      .where(
        and(
          eq(schema.phoneChangeRequests.providerId, providerId),
          eq(schema.phoneChangeRequests.status, 'PENDING')
        )
      )
      .limit(1);

    if (existingPending) {
      throw new AppError(
        409,
        'PENDING_REQUEST_EXISTS',
        'A pending phone change request already exists'
      );
    }

    try {
      const [request] = await db
        .insert(schema.phoneChangeRequests)
        .values({
          providerId,
          newPhone: normalizedPhone,
          reason: reason || null,
          status: 'PENDING',
        })
        .returning();

      return request;
    } catch (err) {
      if (err.code === '23505') {
        throw new AppError(
          409,
          'PENDING_REQUEST_EXISTS',
          'A pending phone change request already exists'
        );
      }
      throw err;
    }
  }

  /**
   * Get latest phone change request for provider (spec §6.4)
   */
  static async getCurrentPhoneChangeRequest(providerId) {
    const [request] = await db
      .select({
        id: schema.phoneChangeRequests.id,
        newPhone: schema.phoneChangeRequests.newPhone,
        reason: schema.phoneChangeRequests.reason,
        status: schema.phoneChangeRequests.status,
        rejectionReason: schema.phoneChangeRequests.rejectionReason,
        createdAt: schema.phoneChangeRequests.createdAt,
        reviewedAt: schema.phoneChangeRequests.reviewedAt,
      })
      .from(schema.phoneChangeRequests)
      .where(eq(schema.phoneChangeRequests.providerId, providerId))
      .orderBy(desc(schema.phoneChangeRequests.createdAt), desc(schema.phoneChangeRequests.id))
      .limit(1);

    return request || null;
  }

  /**
   * Cancel provider's own pending phone change request (spec §6.4)
   */
  static async cancelCurrentPhoneChangeRequest(providerId) {
    const [pendingRequest] = await db
      .select({ id: schema.phoneChangeRequests.id })
      .from(schema.phoneChangeRequests)
      .where(
        and(
          eq(schema.phoneChangeRequests.providerId, providerId),
          eq(schema.phoneChangeRequests.status, 'PENDING')
        )
      )
      .limit(1);

    if (!pendingRequest) {
      throw new AppError(404, 'NOT_FOUND', 'No pending phone change request found to cancel');
    }

    await db
      .update(schema.phoneChangeRequests)
      .set({
        status: 'CANCELLED',
      })
      .where(eq(schema.phoneChangeRequests.id, pendingRequest.id));

    return { message: 'Phone change request cancelled successfully' };
  }
}
