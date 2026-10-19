import { describe, it, expect } from 'vitest';
import { validateEnv } from '../../src/config/env.js';

describe('Environment Configuration (src/config/env.js)', () => {
  it('passes validation with valid minimal environment', () => {
    const validConfig = {
      NODE_ENV: 'development',
      PORT: '5000',
      DATABASE_URL: 'postgresql://user:pass@localhost:5432/db',
      JWT_SECRET: 'a_very_long_secure_secret_at_least_32_characters_long',
      CALL_IP_HMAC_SECRET: 'another_very_long_secret_at_least_32_characters_long',
    };

    const parsed = validateEnv(validConfig);
    expect(parsed.PORT).toBe(5000);
    expect(parsed.NODE_ENV).toBe('development');
  });

  it('fails startup if JWT_SECRET is shorter than 32 characters', () => {
    const invalidConfig = {
      NODE_ENV: 'development',
      DATABASE_URL: 'postgresql://user:pass@localhost:5432/db',
      JWT_SECRET: 'too_short',
      CALL_IP_HMAC_SECRET: 'another_very_long_secret_at_least_32_characters_long',
    };

    expect(() => validateEnv(invalidConfig)).toThrow(/JWT_SECRET must be at least 32 characters/);
  });

  it('fails startup if CALL_IP_HMAC_SECRET is missing', () => {
    const invalidConfig = {
      NODE_ENV: 'development',
      DATABASE_URL: 'postgresql://user:pass@localhost:5432/db',
      JWT_SECRET: 'a_very_long_secure_secret_at_least_32_characters_long',
    };

    expect(() => validateEnv(invalidConfig)).toThrow(/CALL_IP_HMAC_SECRET/);
  });

  it('fails startup in production when production secrets are missing', () => {
    const prodConfigMissingSecrets = {
      NODE_ENV: 'production',
      PORT: '5000',
      DATABASE_URL: 'postgresql://user:pass@pooler.neon.tech/db',
      JWT_SECRET: 'a_very_long_secure_secret_at_least_32_characters_long',
      CALL_IP_HMAC_SECRET: 'another_very_long_secret_at_least_32_characters_long',
      // Missing DATABASE_URL_DIRECT, CLOUD_STORAGE_*
    };

    expect(() => validateEnv(prodConfigMissingSecrets)).toThrow(/DATABASE_URL_DIRECT is required in production/);
    expect(() => validateEnv(prodConfigMissingSecrets)).toThrow(/CLOUD_STORAGE_BUCKET is required in production/);
  });
});
