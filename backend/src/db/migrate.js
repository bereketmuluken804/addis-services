import pg from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { env } from '../config/env.js';

const rawUrl = env.DATABASE_URL_DIRECT || env.DATABASE_URL;
const connectionString = (rawUrl || '')
  .replace(/([&?])channel_binding=[^&]*/g, '')
  .replace(/\?$/, '');

async function runMigrations() {
  console.log('[migrate] Connecting to direct database for migrations...');
  const client = new pg.Client({
    connectionString,
    connectionTimeoutMillis: 15000,
  });

  await client.connect();
  const db = drizzle(client);

  try {
    console.log('[migrate] Running drizzle migrations from ./drizzle folder...');
    await migrate(db, { migrationsFolder: './drizzle' });
    console.log('[migrate] Migrations completed successfully.');
  } finally {
    await client.end();
  }
}

runMigrations().catch((err) => {
  console.error('[migrate] Migration failed:', err);
  process.exit(1);
});
