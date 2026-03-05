import { hashPassword, isPasswordHash, verifyPassword } from '@/lib/auth/passwords';

describe('passwords helper', () => {
  test('hashPassword generates prefixed hash', () => {
    const hashed = hashPassword('secret123');
    expect(isPasswordHash(hashed)).toBe(true);
  });

  test('verifyPassword handles legacy plain text and mismatches', () => {
    expect(verifyPassword('abc', 'abc')).toBe(true);
    expect(verifyPassword('abc', 'abcd')).toBe(false);
    expect(verifyPassword('x', '')).toBe(false);
  });

  test('verifyPassword validates hashed format branches', () => {
    const hashed = hashPassword('secret123');
    expect(verifyPassword('secret123', hashed)).toBe(true);
    expect(verifyPassword('wrong', hashed)).toBe(false);
    expect(verifyPassword('x', 'scrypt$bad')).toBe(false);
    expect(verifyPassword('x', 'scrypt$1$2$3$$')).toBe(false);
    expect(() => verifyPassword('x', 'scrypt$1$2$3$salt$ff')).toThrow();
    expect(() => verifyPassword('x', 'scrypt$1$2$3$salt$00')).toThrow();
  });
});
