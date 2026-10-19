import { eq, and } from 'drizzle-orm';
import { db } from '../../db/client.js';
import * as schema from '../../db/schema.js';
import { AppError } from '../../middleware/errorHandler.js';

export class CustomerService {
  /**
   * Create review for an eligible provider (spec §6.5)
   * Target must be publicly eligible (Invariant #1).
   * One review per customer per provider enforced by DB unique constraint (409 on conflict).
   */
  static async createReview({ providerId, customerId, rating, comment }) {
    // 1. Invariant #1: provider must be eligible
    const [provider] = await db
      .select({ id: schema.providers.id })
      .from(schema.providers)
      .where(and(eq(schema.providers.id, providerId), schema.isPubliclyEligible))
      .limit(1);

    if (!provider) {
      throw new AppError(404, 'NOT_FOUND', 'Provider not found or ineligible');
    }

    try {
      const [review] = await db
        .insert(schema.providerReviews)
        .values({
          providerId,
          customerId,
          rating,
          comment: comment || null,
          status: 'PUBLISHED',
        })
        .returning();

      return review;
    } catch (err) {
      if (err.code === '23505') {
        throw new AppError(
          409,
          'DUPLICATE_REVIEW',
          'You have already submitted a review for this provider'
        );
      }
      throw err;
    }
  }

  /**
   * Edit existing review (owner only) (spec §6.5)
   */
  static async updateReview({ reviewId, customerId, rating, comment }) {
    const [existing] = await db
      .select()
      .from(schema.providerReviews)
      .where(eq(schema.providerReviews.id, reviewId))
      .limit(1);

    if (!existing) {
      throw new AppError(404, 'NOT_FOUND', 'Review not found');
    }

    if (existing.customerId !== customerId) {
      throw new AppError(403, 'FORBIDDEN', 'You do not have permission to edit this review');
    }

    const updateData = {
      updatedAt: new Date(),
    };
    if (rating !== undefined) updateData.rating = rating;
    if (comment !== undefined) updateData.comment = comment;

    const [updated] = await db
      .update(schema.providerReviews)
      .set(updateData)
      .where(eq(schema.providerReviews.id, reviewId))
      .returning();

    return updated;
  }

  /**
   * Delete review (owner only) (spec §6.5)
   */
  static async deleteReview({ reviewId, customerId }) {
    const [existing] = await db
      .select()
      .from(schema.providerReviews)
      .where(eq(schema.providerReviews.id, reviewId))
      .limit(1);

    if (!existing) {
      throw new AppError(404, 'NOT_FOUND', 'Review not found');
    }

    if (existing.customerId !== customerId) {
      throw new AppError(403, 'FORBIDDEN', 'You do not have permission to delete this review');
    }

    await db
      .delete(schema.providerReviews)
      .where(eq(schema.providerReviews.id, reviewId));

    return { message: 'Review deleted successfully' };
  }

  /**
   * Report review (spec §6.5)
   * One report per customer per review.
   */
  static async reportReview({ reviewId, customerId, reason }) {
    const [review] = await db
      .select({ id: schema.providerReviews.id })
      .from(schema.providerReviews)
      .where(eq(schema.providerReviews.id, reviewId))
      .limit(1);

    if (!review) {
      throw new AppError(404, 'NOT_FOUND', 'Review not found');
    }

    try {
      await db.insert(schema.reviewReports).values({
        reviewId,
        reporterCustomerId: customerId,
        reason,
      });

      return { message: 'Review reported successfully' };
    } catch (err) {
      if (err.code === '23505') {
        throw new AppError(
          409,
          'DUPLICATE_REPORT',
          'You have already reported this review'
        );
      }
      throw err;
    }
  }
}
