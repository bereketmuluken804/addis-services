import crypto from 'node:crypto';
import { eq, and } from 'drizzle-orm';
import { db } from '../../db/client.js';
import * as schema from '../../db/schema.js';
import { AppError } from '../../middleware/errorHandler.js';
import { hashPassword, comparePassword, dummyPasswordCompare } from '../../lib/crypto.js';
import { signAccessToken, generateRefreshToken, hashToken } from '../../lib/tokens.js';
import { getStorage } from '../../lib/storage/index.js';
import { env } from '../../config/env.js';

export class AuthService {
  /**
   * Safe provider projection — never exposes passwordHash or private keys.
   */
  static sanitizeProvider(provider) {
    const { passwordHash: _hash, ...safe } = provider;
    return safe;
  }

  static sanitizeCustomer(customer) {
    const { passwordHash: _hash, ...safe } = customer;
    return safe;
  }

  /**
   * Helper to issue access JWT + refresh token.
   */
  static async issueTokens(tx, { ownerId, role, familyId = null }) {
    const accessToken = signAccessToken({ sub: ownerId, role });
    const rawRefreshToken = generateRefreshToken();
    const tokenHash = hashToken(rawRefreshToken);
    const activeFamilyId = familyId || crypto.randomUUID();

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + env.REFRESH_TOKEN_TTL_DAYS);

    const tokenData = {
      tokenHash,
      familyId: activeFamilyId,
      expiresAt,
    };

    if (role === 'PROVIDER') tokenData.providerId = ownerId;
    else if (role === 'CUSTOMER') tokenData.customerId = ownerId;
    else if (role === 'ADMIN') tokenData.adminUserId = ownerId;

    await tx.insert(schema.refreshTokens).values(tokenData);

    return {
      accessToken,
      refreshToken: rawRefreshToken,
    };
  }

  /**
   * Provider Registration with ID document upload & orphan cleanup.
   */
  static async registerProvider(data, file) {
    const storage = getStorage();

    // 1. Validate Category
    const [category] = await db
      .select()
      .from(schema.categories)
      .where(and(eq(schema.categories.id, data.categoryId), eq(schema.categories.isActive, true)))
      .limit(1);

    if (!category) {
      throw new AppError(400, 'INVALID_CATEGORY', 'Selected category is invalid or inactive');
    }

    // 2. Validate City
    const [city] = await db
      .select()
      .from(schema.cities)
      .where(and(eq(schema.cities.id, data.cityId), eq(schema.cities.isActive, true)))
      .limit(1);

    if (!city) {
      throw new AppError(400, 'INVALID_LOCATION', 'Selected city is invalid or inactive');
    }

    // 3. Validate Sub-city belongs to City
    const [subCity] = await db
      .select()
      .from(schema.subCities)
      .where(
        and(
          eq(schema.subCities.id, data.subCityId),
          eq(schema.subCities.cityId, data.cityId),
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

    // 4. Check phone uniqueness
    const [existingProvider] = await db
      .select()
      .from(schema.providers)
      .where(eq(schema.providers.phone, data.phone))
      .limit(1);

    if (existingProvider) {
      throw new AppError(409, 'PHONE_ALREADY_REGISTERED', 'Phone number is already registered');
    }

    // 5. Upload document to private storage first
    const objectKey = `id-docs/${crypto.randomUUID()}.${file.verifiedExt || 'jpg'}`;
    await storage.upload({
      key: objectKey,
      buffer: file.buffer,
      contentType: file.verifiedMime || 'image/jpeg',
    });

    // 6. DB write inside transaction with orphan cleanup on failure
    try {
      return await db.transaction(async (tx) => {
        const passwordHash = await hashPassword(data.password);

        const [newProvider] = await tx
          .insert(schema.providers)
          .values({
            fullName: data.fullName,
            phone: data.phone,
            passwordHash,
            cityId: data.cityId,
            subCityId: data.subCityId,
            categoryId: data.categoryId,
            woreda: data.woreda || null,
            bio: data.bio || null,
            experienceYears: data.experienceYears || null,
            avatarUrl: data.avatarUrl || null,
            workSamples: data.workSamples || [],
            verificationStatus: 'PENDING',
            isActive: false,
            isAvailable: false,
          })
          .returning();

        await tx.insert(schema.providerVerificationDocuments).values({
          providerId: newProvider.id,
          objectKey,
          status: 'PENDING',
        });

        const tokens = await AuthService.issueTokens(tx, {
          ownerId: newProvider.id,
          role: 'PROVIDER',
        });

        return {
          provider: AuthService.sanitizeProvider(newProvider),
          tokens,
        };
      });
    } catch (err) {
      // Orphan cleanup: delete uploaded object if DB write fails
      await storage.delete(objectKey).catch(() => {});

      if (err.code === '23505') {
        // Postgres unique violation
        throw new AppError(409, 'PHONE_ALREADY_REGISTERED', 'Phone number is already registered');
      }
      throw err;
    }
  }

  /**
   * Customer Registration
   */
  static async registerCustomer(data) {
    const [existingCustomer] = await db
      .select()
      .from(schema.customerUsers)
      .where(eq(schema.customerUsers.phone, data.phone))
      .limit(1);

    if (existingCustomer) {
      throw new AppError(409, 'PHONE_ALREADY_REGISTERED', 'Phone number is already registered');
    }

    return await db.transaction(async (tx) => {
      const passwordHash = await hashPassword(data.password);

      const [newCustomer] = await tx
        .insert(schema.customerUsers)
        .values({
          fullName: data.fullName,
          phone: data.phone,
          passwordHash,
        })
        .returning();

      const tokens = await AuthService.issueTokens(tx, {
        ownerId: newCustomer.id,
        role: 'CUSTOMER',
      });

      return {
        customer: AuthService.sanitizeCustomer(newCustomer),
        tokens,
      };
    });
  }

  /**
   * Provider Login
   */
  static async loginProvider({ phone, password }) {
    const [provider] = await db
      .select()
      .from(schema.providers)
      .where(eq(schema.providers.phone, phone))
      .limit(1);

    if (!provider) {
      await dummyPasswordCompare();
      throw new AppError(401, 'INVALID_CREDENTIALS', 'Invalid phone number or password');
    }

    const isValid = await comparePassword(password, provider.passwordHash);
    if (!isValid) {
      throw new AppError(401, 'INVALID_CREDENTIALS', 'Invalid phone number or password');
    }

    const tokens = await db.transaction(async (tx) => {
      return await AuthService.issueTokens(tx, {
        ownerId: provider.id,
        role: 'PROVIDER',
      });
    });

    return {
      provider: AuthService.sanitizeProvider(provider),
      tokens,
    };
  }

  /**
   * Customer Login
   */
  static async loginCustomer({ phone, password }) {
    const [customer] = await db
      .select()
      .from(schema.customerUsers)
      .where(eq(schema.customerUsers.phone, phone))
      .limit(1);

    if (!customer) {
      await dummyPasswordCompare();
      throw new AppError(401, 'INVALID_CREDENTIALS', 'Invalid phone number or password');
    }

    const isValid = await comparePassword(password, customer.passwordHash);
    if (!isValid) {
      throw new AppError(401, 'INVALID_CREDENTIALS', 'Invalid phone number or password');
    }

    const tokens = await db.transaction(async (tx) => {
      return await AuthService.issueTokens(tx, {
        ownerId: customer.id,
        role: 'CUSTOMER',
      });
    });

    return {
      customer: AuthService.sanitizeCustomer(customer),
      tokens,
    };
  }

  /**
   * Token Refresh with Reuse Detection (Family Revocation)
   */
  static async refreshTokens(rawRefreshToken) {
    if (!rawRefreshToken) {
      throw new AppError(401, 'UNAUTHORIZED', 'Refresh token required');
    }

    const tokenHash = hashToken(rawRefreshToken);

    const [tokenRecord] = await db
      .select()
      .from(schema.refreshTokens)
      .where(eq(schema.refreshTokens.tokenHash, tokenHash))
      .limit(1);

    if (!tokenRecord) {
      throw new AppError(401, 'INVALID_REFRESH_TOKEN', 'Invalid refresh token');
    }

    // Reuse detection: If token was already revoked or replaced, revoke the entire family!
    if (tokenRecord.revokedAt || tokenRecord.replacedByTokenHash) {
      await db
        .update(schema.refreshTokens)
        .set({ revokedAt: new Date() })
        .where(eq(schema.refreshTokens.familyId, tokenRecord.familyId));

      throw new AppError(
        401,
        'REFRESH_TOKEN_REUSE',
        'Refresh token reuse detected. All sessions in this family have been terminated.'
      );
    }

    // Expiry check
    if (new Date(tokenRecord.expiresAt) < new Date()) {
      await db
        .update(schema.refreshTokens)
        .set({ revokedAt: new Date() })
        .where(eq(schema.refreshTokens.id, tokenRecord.id));

      throw new AppError(401, 'REFRESH_TOKEN_EXPIRED', 'Refresh token has expired');
    }

    // Determine owner and role
    let ownerId;
    let role;
    if (tokenRecord.providerId) {
      ownerId = tokenRecord.providerId;
      role = 'PROVIDER';
    } else if (tokenRecord.customerId) {
      ownerId = tokenRecord.customerId;
      role = 'CUSTOMER';
    } else if (tokenRecord.adminUserId) {
      ownerId = tokenRecord.adminUserId;
      role = 'ADMIN';
    } else {
      throw new AppError(401, 'INVALID_REFRESH_TOKEN', 'Token has no associated owner');
    }

    // Rotate token inside transaction
    return await db.transaction(async (tx) => {
      const newRawRefreshToken = generateRefreshToken();
      const newTokenHash = hashToken(newRawRefreshToken);

      // 1. Invalidate current token and mark replaced
      await tx
        .update(schema.refreshTokens)
        .set({
          revokedAt: new Date(),
          replacedByTokenHash: newTokenHash,
        })
        .where(eq(schema.refreshTokens.id, tokenRecord.id));

      // 2. Insert new token under same familyId
      const newExpiresAt = new Date();
      newExpiresAt.setDate(newExpiresAt.getDate() + env.REFRESH_TOKEN_TTL_DAYS);

      const tokenData = {
        tokenHash: newTokenHash,
        familyId: tokenRecord.familyId,
        expiresAt: newExpiresAt,
      };

      if (role === 'PROVIDER') tokenData.providerId = ownerId;
      else if (role === 'CUSTOMER') tokenData.customerId = ownerId;
      else if (role === 'ADMIN') tokenData.adminUserId = ownerId;

      await tx.insert(schema.refreshTokens).values(tokenData);

      const newAccessToken = signAccessToken({ sub: ownerId, role });

      return {
        accessToken: newAccessToken,
        refreshToken: newRawRefreshToken,
      };
    });
  }

  /**
   * Logout — Revokes entire token family
   */
  static async logout(rawRefreshToken) {
    if (!rawRefreshToken) return;

    const tokenHash = hashToken(rawRefreshToken);
    const [tokenRecord] = await db
      .select()
      .from(schema.refreshTokens)
      .where(eq(schema.refreshTokens.tokenHash, tokenHash))
      .limit(1);

    if (tokenRecord) {
      await db
        .update(schema.refreshTokens)
        .set({ revokedAt: new Date() })
        .where(eq(schema.refreshTokens.familyId, tokenRecord.familyId));
    }
  }
}
