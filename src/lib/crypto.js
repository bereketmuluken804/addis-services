import bcrypt from 'bcrypt';
import crypto from 'node:crypto';
import { env } from '../config/env.js';

// Pre-computed dummy hash to run comparison when account does not exist (prevents timing attacks)
const DUMMY_HASH = '$2b$10$nOUIs5kJ7naTuTFkBy1veuK0kSxUFXfuaOKdOKf9xYT0KKGpeEx2.';

export async function hashPassword(plainText) {
  return await bcrypt.hash(plainText, env.BCRYPT_ROUNDS);
}

export async function comparePassword(plainText, hash) {
  return await bcrypt.compare(plainText, hash);
}

export async function dummyPasswordCompare() {
  await bcrypt.compare('dummy_password_timing_check', DUMMY_HASH);
}

export function computeIpHmac(ip) {
  return crypto
    .createHmac('sha256', env.CALL_IP_HMAC_SECRET)
    .update(ip)
    .digest('hex');
}

export function generateTemporaryPassword() {
  // Spec §4.4: random temporary password (>= 12 chars, crypto-based)
  // 12 random bytes in base64url produce 16 URL-safe characters
  return crypto.randomBytes(12).toString('base64url');
}
