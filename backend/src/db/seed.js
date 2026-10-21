import bcrypt from 'bcrypt';
import { eq } from 'drizzle-orm';
import { db, pool } from './client.js';
import * as schema from './schema.js';
import { initialCity, initialSubCities, initialCategories } from './seed-data.js';
import { env } from '../config/env.js';

export async function seed(database = db) {
  return await database.transaction(async (tx) => {
    // 1. Seed or get City
    let [city] = await tx
      .select()
      .from(schema.cities)
      .where(eq(schema.cities.slug, initialCity.slug))
      .limit(1);

    if (!city) {
      [city] = await tx
        .insert(schema.cities)
        .values(initialCity)
        .returning();
      console.log(`[seed] Created city: ${city.nameEn}`);
    } else {
      console.log(`[seed] City already exists: ${city.nameEn}`);
    }

    // 2. Seed Sub-cities
    for (const subCityData of initialSubCities) {
      const existing = await tx
        .select()
        .from(schema.subCities)
        .where(eq(schema.subCities.slug, subCityData.slug))
        .limit(1);

      if (existing.length === 0) {
        await tx.insert(schema.subCities).values({
          ...subCityData,
          cityId: city.id,
          isActive: true,
        });
        console.log(`[seed] Created sub-city: ${subCityData.nameEn}`);
      }
    }

    // 3. Seed Categories
    for (const catData of initialCategories) {
      const existing = await tx
        .select()
        .from(schema.categories)
        .where(eq(schema.categories.slug, catData.slug))
        .limit(1);

      if (existing.length === 0) {
        await tx.insert(schema.categories).values(catData);
        console.log(`[seed] Created category: ${catData.nameEn}`);
      }
    }

    // 4. Seed Admin User
    if (env.ADMIN_INITIAL_EMAIL) {
      const [existingAdmin] = await tx
        .select()
        .from(schema.adminUsers)
        .where(eq(schema.adminUsers.email, env.ADMIN_INITIAL_EMAIL.toLowerCase()))
        .limit(1);

      if (!existingAdmin) {
        if (!env.ADMIN_INITIAL_PASSWORD) {
          throw new Error(
            'ADMIN_INITIAL_PASSWORD is required when creating an initial admin user.'
          );
        }
        const passwordHash = await bcrypt.hash(
          env.ADMIN_INITIAL_PASSWORD,
          env.BCRYPT_ROUNDS
        );
        await tx.insert(schema.adminUsers).values({
          email: env.ADMIN_INITIAL_EMAIL.toLowerCase(),
          passwordHash,
        });
        console.log(`[seed] Created initial admin: ${env.ADMIN_INITIAL_EMAIL}`);
      } else {
        console.log(`[seed] Admin user exists, password left untouched.`);
      }
    }
  });
}

// Execute directly if run via `npm run seed`
if (process.argv[1] && process.argv[1].endsWith('seed.js')) {
  seed()
    .then(async () => {
      console.log('[seed] Seeding completed successfully.');
      await pool.end();
      process.exit(0);
    })
    .catch(async (err) => {
      console.error('[seed] Seeding failed:', err);
      await pool.end();
      process.exit(1);
    });
}
