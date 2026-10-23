import {
  pgTable,
  serial,
  text,
  varchar,
  boolean,
  integer,
  timestamp,
  jsonb,
  uuid,
  index,
  unique,
  uniqueIndex,
  check,
  foreignKey,
} from 'drizzle-orm/pg-core';
import { sql, and, eq } from 'drizzle-orm';

// Reference Tables
export const cities = pgTable('cities', {
  id: serial('id').primaryKey(),
  nameEn: text('name_en').notNull(),
  nameAm: text('name_am').notNull(),
  slug: text('slug').notNull().unique(),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const subCities = pgTable(
  'sub_cities',
  {
    id: serial('id').primaryKey(),
    cityId: integer('city_id')
      .notNull()
      .references(() => cities.id, { onDelete: 'cascade' }),
    nameEn: text('name_en').notNull(),
    nameAm: text('name_am').notNull(),
    slug: text('slug').notNull(),
    isActive: boolean('is_active').notNull().default(true),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    unique('sub_cities_city_slug_unique').on(table.cityId, table.slug),
    unique('sub_cities_city_id_unique').on(table.cityId, table.id),
  ]
);

export const categories = pgTable('categories', {
  id: serial('id').primaryKey(),
  nameEn: text('name_en').notNull(),
  nameAm: text('name_am').notNull(),
  slug: text('slug').notNull().unique(),
  iconName: text('icon_name').notNull(),
  displayOrder: integer('display_order').notNull().default(0),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

// Admin Users
export const adminUsers = pgTable('admin_users', {
  id: serial('id').primaryKey(),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

// Customer Users
export const customerUsers = pgTable('customer_users', {
  id: serial('id').primaryKey(),
  fullName: text('full_name').notNull(),
  phone: varchar('phone', { length: 20 }).notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

// Providers
export const providers = pgTable(
  'providers',
  {
    id: serial('id').primaryKey(),
    fullName: text('full_name').notNull(),
    phone: varchar('phone', { length: 20 }).notNull().unique(),
    passwordHash: text('password_hash').notNull(),
    mustChangePassword: boolean('must_change_password').notNull().default(false),
    cityId: integer('city_id')
      .notNull()
      .references(() => cities.id),
    subCityId: integer('sub_city_id').notNull(),
    woreda: text('woreda'),
    categoryId: integer('category_id')
      .notNull()
      .references(() => categories.id),
    bio: text('bio'),
    experienceYears: integer('experience_years'),
    avatarUrl: text('avatar_url'),
    workSamples: jsonb('work_samples').notNull().default([]),

    // Admin-controlled verification & lifecycle
    verificationStatus: varchar('verification_status', { length: 20 })
      .notNull()
      .default('PENDING'),
    verificationRejectionReason: text('verification_rejection_reason'),
    verificationReviewedAt: timestamp('verification_reviewed_at', { withTimezone: true }),
    verificationReviewedBy: integer('verification_reviewed_by').references(() => adminUsers.id),

    isActive: boolean('is_active').notNull().default(false),
    activatedAt: timestamp('activated_at', { withTimezone: true }),
    activatedBy: integer('activated_by').references(() => adminUsers.id),
    suspendedAt: timestamp('suspended_at', { withTimezone: true }),
    suspendedBy: integer('suspended_by').references(() => adminUsers.id),
    suspensionReason: text('suspension_reason'),

    // Provider-controlled availability badge
    isAvailable: boolean('is_available').notNull().default(true),

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    foreignKey({
      columns: [table.cityId, table.subCityId],
      foreignColumns: [subCities.cityId, subCities.id],
      name: 'providers_city_sub_city_fk',
    }),
    index('providers_public_search_idx').on(
      table.verificationStatus,
      table.isActive,
      table.cityId,
      table.subCityId,
      table.categoryId
    ),
  ]
);

// Provider Verification Documents
export const providerVerificationDocuments = pgTable('provider_verification_documents', {
  id: serial('id').primaryKey(),
  providerId: integer('provider_id')
    .notNull()
    .references(() => providers.id, { onDelete: 'cascade' }),
  objectKey: text('object_key').notNull(),
  status: varchar('status', { length: 20 }).notNull().default('PENDING'),
  rejectionReason: text('rejection_reason'),
  reviewedAt: timestamp('reviewed_at', { withTimezone: true }),
  reviewedBy: integer('reviewed_by').references(() => adminUsers.id),
  uploadedAt: timestamp('uploaded_at', { withTimezone: true }).notNull().defaultNow(),
});

// Provider Reviews
export const providerReviews = pgTable(
  'provider_reviews',
  {
    id: serial('id').primaryKey(),
    providerId: integer('provider_id')
      .notNull()
      .references(() => providers.id, { onDelete: 'cascade' }),
    customerId: integer('customer_id')
      .notNull()
      .references(() => customerUsers.id, { onDelete: 'cascade' }),
    rating: integer('rating').notNull(),
    comment: text('comment'),
    status: varchar('status', { length: 20 }).notNull().default('PUBLISHED'),
    moderatedBy: integer('moderated_by').references(() => adminUsers.id),
    moderatedAt: timestamp('moderated_at', { withTimezone: true }),
    moderationReason: text('moderation_reason'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    unique('provider_reviews_provider_customer_unique').on(table.providerId, table.customerId),
    check('provider_reviews_rating_range', sql`rating >= 1 AND rating <= 5`),
    index('provider_reviews_search_idx').on(table.providerId, table.status, table.createdAt),
  ]
);

// Call Logs (Call-click events)
export const callLogs = pgTable(
  'call_logs',
  {
    id: serial('id').primaryKey(),
    providerId: integer('provider_id')
      .notNull()
      .references(() => providers.id, { onDelete: 'cascade' }),
    clientIpHmac: varchar('client_ip_hmac', { length: 64 }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('call_logs_provider_created_idx').on(table.providerId, table.createdAt),
    index('call_logs_dedup_idx').on(table.clientIpHmac, table.providerId, table.createdAt),
  ]
);

// Refresh Tokens (Token rotation with family reuse detection)
export const refreshTokens = pgTable(
  'refresh_tokens',
  {
    id: serial('id').primaryKey(),
    tokenHash: varchar('token_hash', { length: 64 }).notNull().unique(),
    providerId: integer('provider_id').references(() => providers.id, { onDelete: 'cascade' }),
    customerId: integer('customer_id').references(() => customerUsers.id, { onDelete: 'cascade' }),
    adminUserId: integer('admin_user_id').references(() => adminUsers.id, { onDelete: 'cascade' }),
    familyId: uuid('family_id').notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    revokedAt: timestamp('revoked_at', { withTimezone: true }),
    replacedByTokenHash: varchar('replaced_by_token_hash', { length: 64 }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (_table) => [
    check(
      'refresh_tokens_single_owner_check',
      sql`num_nonnulls(provider_id, customer_id, admin_user_id) = 1`
    ),
  ]
);

// Phone Change Requests
export const phoneChangeRequests = pgTable(
  'phone_change_requests',
  {
    id: serial('id').primaryKey(),
    providerId: integer('provider_id')
      .notNull()
      .references(() => providers.id, { onDelete: 'cascade' }),
    newPhone: varchar('new_phone', { length: 20 }).notNull(),
    reason: text('reason'),
    status: varchar('status', { length: 20 }).notNull().default('PENDING'),
    rejectionReason: text('rejection_reason'),
    reviewedAt: timestamp('reviewed_at', { withTimezone: true }),
    reviewedBy: integer('reviewed_by').references(() => adminUsers.id),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('phone_change_requests_pending_unique')
      .on(table.providerId)
      .where(sql`status = 'PENDING'`),
  ]
);

// Admin Audit Log
export const adminAuditLog = pgTable('admin_audit_log', {
  id: serial('id').primaryKey(),
  adminId: integer('admin_id')
    .notNull()
    .references(() => adminUsers.id),
  action: text('action').notNull(),
  targetType: text('target_type').notNull(),
  targetId: integer('target_id').notNull(),
  reason: text('reason'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

// Review Reports
export const reviewReports = pgTable(
  'review_reports',
  {
    id: serial('id').primaryKey(),
    reviewId: integer('review_id')
      .notNull()
      .references(() => providerReviews.id, { onDelete: 'cascade' }),
    reporterCustomerId: integer('reporter_customer_id')
      .notNull()
      .references(() => customerUsers.id, { onDelete: 'cascade' }),
    reason: text('reason').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    unique('review_reports_review_customer_unique').on(table.reviewId, table.reporterCustomerId),
  ]
);

// Invariant #1: Public eligibility is verificationStatus = 'APPROVED' AND isActive = true.
// One shared helper/SQL fragment is used by every public query and by call-click recording.
export const isPubliclyEligible = and(
  eq(providers.verificationStatus, 'APPROVED'),
  eq(providers.isActive, true)
);
