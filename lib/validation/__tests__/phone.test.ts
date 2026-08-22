import { describe, it, expect } from 'vitest';
import {
  PHONE_E164,
  normalizePhoneNumber,
  optionalPhoneNumberSchema,
} from '@/lib/validation/phone';

/**
 * The regex is a copy of the live DB constraint, read from `pg_constraint` on
 * 2026-08-22:
 *
 *   CHECK (phone_number IS NULL
 *          OR phone_number ~ '^\+[1-9]\d{1,14}(\s\d+)?$')
 *
 * If the two ever drift, the app starts accepting values the database rejects —
 * which is what produced JAVASCRIPT-NEXTJS-8.
 */
describe('PHONE_E164 mirrors the profiles.check_phone_format constraint', () => {
  it('accepts what the constraint accepts', () => {
    expect(PHONE_E164.test('+639171234567')).toBe(true);
    expect(PHONE_E164.test('+6321234567')).toBe(true);
    expect(PHONE_E164.test('+639171234567 12')).toBe(true); // extension
  });

  it('rejects what the constraint rejects', () => {
    expect(PHONE_E164.test('')).toBe(false);
    expect(PHONE_E164.test('09171234567')).toBe(false); // no `+`
    expect(PHONE_E164.test('+09171234567')).toBe(false); // leading zero
    expect(PHONE_E164.test('+63 917 123 4567')).toBe(false); // inner spaces
    expect(PHONE_E164.test('+6391712345678901234')).toBe(false); // > 15 digits
  });
});

describe('normalizePhoneNumber', () => {
  it('accepts the way a Filipino owner writes their own number', () => {
    // The whole reason this normalises instead of rejecting: `09171234567` is
    // what is printed on the shop's signage. A field that refuses it is a field
    // nobody can fill.
    expect(normalizePhoneNumber('09171234567')).toBe('+639171234567');
    expect(normalizePhoneNumber('0917 123 4567')).toBe('+639171234567');
    expect(normalizePhoneNumber('0917-123-4567')).toBe('+639171234567');
    expect(normalizePhoneNumber('(0917) 123 4567')).toBe('+639171234567');
  });

  it('leaves an international number alone', () => {
    // An owner who is not Filipino must not be rewritten as one.
    expect(normalizePhoneNumber('+14155550123')).toBe('+14155550123');
    expect(normalizePhoneNumber('+1 415 555 0123')).toBe('+14155550123');
  });

  it('restores a missing plus on a country-coded number', () => {
    expect(normalizePhoneNumber('639171234567')).toBe('+639171234567');
  });

  it('is null for blank, so the column gets NULL and not an empty string', () => {
    // `''` is not NULL and does not match the CHECK, so the old behaviour made
    // "clear my phone number" a 500.
    expect(normalizePhoneNumber('')).toBeNull();
    expect(normalizePhoneNumber('   ')).toBeNull();
    expect(normalizePhoneNumber('--')).toBeNull();
  });

  it('does not invent a prefix for something unrecognisable', () => {
    expect(normalizePhoneNumber('abc')).toBe('abc');
  });
});

describe('optionalPhoneNumberSchema', () => {
  it('parses a local number into the stored form', () => {
    expect(optionalPhoneNumberSchema.parse('09171234567')).toBe(
      '+639171234567',
    );
  });

  it('parses blank to null', () => {
    expect(optionalPhoneNumberSchema.parse('')).toBeNull();
  });

  it('refuses anything the database would refuse', () => {
    for (const bad of ['abc', '+0123', '12', '+']) {
      expect(optionalPhoneNumberSchema.safeParse(bad).success).toBe(false);
    }
  });

  it('every value it accepts satisfies the DB constraint', () => {
    // The invariant that matters: nothing this schema lets through can reach
    // Postgres and violate the CHECK.
    for (const input of [
      '09171234567',
      '0917 123 4567',
      '+639171234567',
      '+14155550123',
      '639171234567',
      '',
    ]) {
      const parsed = optionalPhoneNumberSchema.parse(input);
      expect(parsed === null || PHONE_E164.test(parsed)).toBe(true);
    }
  });
});
