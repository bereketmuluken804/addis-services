import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(5000),
  
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  DATABASE_URL_DIRECT: z.string().optional(),
  
  CORS_ORIGINS: z.string().default('http://localhost:3000,http://localhost:5173'),
  TRUST_PROXY_HOPS: z.coerce.number().int().nonnegative().default(1),
  
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
  JWT_ISSUER: z.string().default('domestic-services-api'),
  JWT_AUDIENCE: z.string().default('domestic-services-client'),
  ACCESS_TOKEN_TTL: z.string().default('15m'),
  REFRESH_TOKEN_TTL_DAYS: z.coerce.number().int().positive().default(7),
  
  BCRYPT_ROUNDS: z.coerce.number().int().min(4).max(15).default(10),
  CALL_IP_HMAC_SECRET: z.string().min(32, 'CALL_IP_HMAC_SECRET must be at least 32 characters'),
  CALL_CLICK_DEDUP_WINDOW_SECONDS: z.coerce.number().int().positive().default(300),
  
  CLOUD_STORAGE_BUCKET: z.string().optional(),
  CLOUD_STORAGE_REGION: z.string().optional(),
  CLOUD_STORAGE_ENDPOINT: z.string().optional(),
  CLOUD_STORAGE_ACCESS_KEY_ID: z.string().optional(),
  CLOUD_STORAGE_SECRET_ACCESS_KEY: z.string().optional(),
  ID_DOCUMENT_MAX_BYTES: z.coerce.number().int().positive().default(10485760), // 10MB
  ID_DOCUMENT_SIGNED_URL_TTL_SECONDS: z.coerce.number().int().positive().default(120),
  
  MEDIA_HOST_ALLOWLIST: z.string().default('res.cloudinary.com,images.unsplash.com'),
  
  ADMIN_INITIAL_EMAIL: z.string().email().optional(),
  ADMIN_INITIAL_PASSWORD: z.string().min(8).optional(),
}).superRefine((data, ctx) => {
  if (data.NODE_ENV === 'production') {
    if (!data.DATABASE_URL_DIRECT) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'DATABASE_URL_DIRECT is required in production',
        path: ['DATABASE_URL_DIRECT'],
      });
    }
    if (!data.CLOUD_STORAGE_BUCKET) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'CLOUD_STORAGE_BUCKET is required in production',
        path: ['CLOUD_STORAGE_BUCKET'],
      });
    }
    if (!data.CLOUD_STORAGE_REGION) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'CLOUD_STORAGE_REGION is required in production',
        path: ['CLOUD_STORAGE_REGION'],
      });
    }
    if (!data.CLOUD_STORAGE_ACCESS_KEY_ID) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'CLOUD_STORAGE_ACCESS_KEY_ID is required in production',
        path: ['CLOUD_STORAGE_ACCESS_KEY_ID'],
      });
    }
    if (!data.CLOUD_STORAGE_SECRET_ACCESS_KEY) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'CLOUD_STORAGE_SECRET_ACCESS_KEY is required in production',
        path: ['CLOUD_STORAGE_SECRET_ACCESS_KEY'],
      });
    }
  }
});

export function validateEnv(input = process.env) {
  const result = envSchema.safeParse(input);
  if (!result.success) {
    const formattedErrors = result.error.errors
      .map((err) => `${err.path.join('.')}: ${err.message}`)
      .join('\n  ');
    throw new Error(`Environment validation failed:\n  ${formattedErrors}`);
  }
  return result.data;
}

let cachedEnv;
try {
  cachedEnv = validateEnv(process.env);
} catch (error) {
  if (process.env.NODE_ENV === 'test') {
    // Provide safe defaults for testing if env is incomplete
    cachedEnv = {
      NODE_ENV: 'test',
      PORT: 5000,
      DATABASE_URL: process.env.DATABASE_URL || 'postgresql://test:test@localhost:5432/test_db',
      DATABASE_URL_DIRECT: process.env.DATABASE_URL_DIRECT || 'postgresql://test:test@localhost:5432/test_db',
      CORS_ORIGINS: 'http://localhost:3000',
      TRUST_PROXY_HOPS: 1,
      JWT_SECRET: process.env.JWT_SECRET || 'test_jwt_secret_must_be_at_least_32_characters_long',
      JWT_ISSUER: 'domestic-services-api',
      JWT_AUDIENCE: 'domestic-services-client',
      ACCESS_TOKEN_TTL: '15m',
      REFRESH_TOKEN_TTL_DAYS: 7,
      BCRYPT_ROUNDS: 4, // Fast for tests
      CALL_IP_HMAC_SECRET: process.env.CALL_IP_HMAC_SECRET || 'test_hmac_secret_must_be_at_least_32_characters_long',
      CALL_CLICK_DEDUP_WINDOW_SECONDS: 300,
      ID_DOCUMENT_MAX_BYTES: 10485760,
      ID_DOCUMENT_SIGNED_URL_TTL_SECONDS: 120,
      MEDIA_HOST_ALLOWLIST: 'res.cloudinary.com,images.unsplash.com',
      ADMIN_INITIAL_EMAIL: 'admin@test.com',
      ADMIN_INITIAL_PASSWORD: 'admin_test_password',
    };
  } else {
    console.error(error.message);
    process.exit(1);
  }
}

export const env = cachedEnv;
