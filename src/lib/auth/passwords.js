import { randomBytes, scryptSync, timingSafeEqual } from 'crypto';

const SCRYPT_N = 16384;
const SCRYPT_R = 8;
const SCRYPT_P = 1;
const KEY_LENGTH = 64;
const SALT_BYTES = 16;
const HASH_PREFIX = 'scrypt';

export function isPasswordHash(value) {
  return typeof value === 'string' && value.startsWith(`${HASH_PREFIX}$`);
}

export function hashPassword(password) {
  const normalized = String(password || '');
  const salt = randomBytes(SALT_BYTES).toString('hex');
  const derived = scryptSync(normalized, salt, KEY_LENGTH, {
    N: SCRYPT_N,
    r: SCRYPT_R,
    p: SCRYPT_P,
  }).toString('hex');

  return `${HASH_PREFIX}$${SCRYPT_N}$${SCRYPT_R}$${SCRYPT_P}$${salt}$${derived}`;
}

export function verifyPassword(password, storedPassword) {
  const normalized = String(password || '');
  const stored = String(storedPassword || '');

  if (!stored) return false;

  if (!isPasswordHash(stored)) {
    const a = Buffer.from(normalized);
    const b = Buffer.from(stored);
    if (a.length !== b.length) return false;
    return timingSafeEqual(a, b);
  }

  const parts = stored.split('$');
  if (parts.length !== 6) return false;

  const [prefix, nRaw, rRaw, pRaw, salt, hashHex] = parts;
  if (prefix !== HASH_PREFIX) return false;

  const n = Number(nRaw);
  const r = Number(rRaw);
  const p = Number(pRaw);

  if (!Number.isFinite(n) || !Number.isFinite(r) || !Number.isFinite(p) || !salt || !hashHex) {
    return false;
  }

  const derived = scryptSync(normalized, salt, hashHex.length / 2, {
    N: n,
    r,
    p,
  });

  const expected = Buffer.from(hashHex, 'hex');
  if (derived.length !== expected.length) return false;
  return timingSafeEqual(derived, expected);
}
