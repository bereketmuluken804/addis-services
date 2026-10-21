import pg from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from './schema.js';
import { env } from '../config/env.js';

const { Pool } = pg;

// Strip channel_binding=require if present, as node-postgres does not support SCRAM channel binding with Neon PgBouncer
const sanitizedConnectionString = (env.DATABASE_URL || '')
  .replace(/([&?])channel_binding=[^&]*/g, '')
  .replace(/\?$/, '');

export const pool = new Pool({
  connectionString: sanitizedConnectionString,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 15000,
});

pool.on('error', (err) => {
  console.error('Unexpected database pool error:', err);
});

export const db = drizzle(pool, { schema });
