import { eq, and, sql } from 'drizzle-orm';
import { db } from '../../db/client.js';
import * as schema from '../../db/schema.js';
import { AppError } from '../../middleware/errorHandler.js';
import { computeIpHmac } from '../../lib/crypto.js';
import { env } from '../../config/env.js';

export class LeadsService {
  /**
   * Records a call-click event with server-side HMAC and advisory-lock deduplication.
   * Spec Invariants #1, #5, §8.
   */
  static async recordCallClick({ providerId, clientIp }) {
    // 1. Invariant #1: Provider must be publicly eligible (isPubliclyEligible)
    const [provider] = await db
      .select({ id: schema.providers.id })
      .from(schema.providers)
      .where(and(eq(schema.providers.id, providerId), schema.isPubliclyEligible))
      .limit(1);

    if (!provider) {
      throw new AppError(404, 'NOT_FOUND', 'Provider not found or ineligible');
    }

    // 2. Invariant #5: Client IP is HMAC'd server-side with CALL_IP_HMAC_SECRET
    const clientIpHmac = computeIpHmac(clientIp);

    // 3. Race-safe deduplication in one transaction with Postgres advisory lock
    return await db.transaction(async (tx) => {
      const lockKey = `${providerId}:${clientIpHmac}`;
      await tx.execute(
        sql`SELECT pg_advisory_xact_lock(hashtextextended(${lockKey}, 0))`
      );

      const windowSeconds = env.CALL_CLICK_DEDUP_WINDOW_SECONDS || 300;
      const cutoffTime = new Date(Date.now() - windowSeconds * 1000);

      const [existingClick] = await tx
        .select({ id: schema.callLogs.id })
        .from(schema.callLogs)
        .where(
          and(
            eq(schema.callLogs.providerId, providerId),
            eq(schema.callLogs.clientIpHmac, clientIpHmac),
            sql`${schema.callLogs.createdAt} >= ${cutoffTime}`
          )
        )
        .limit(1);

      if (existingClick) {
        return { recorded: false };
      }

      await tx.insert(schema.callLogs).values({
        providerId,
        clientIpHmac,
      });

      return { recorded: true };
    });
  }
}
