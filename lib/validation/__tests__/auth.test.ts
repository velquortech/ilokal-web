import { describe, it, expect } from 'vitest';
import {
  signupSchema,
  serverSignupSchema,
  updateCurrentUserProfileSchema,
} from '../auth';

const VALID_SIGNUP = {
  email: 'owner@example.com',
  password: 'StrongPass123',
  confirmPassword: 'StrongPass123',
  name: 'Maria Santos',
  role: 'business_owner' as const,
};

describe('signupSchema name', () => {
  it('accepts a normal name', () => {
    const result = signupSchema.safeParse(VALID_SIGNUP);
    expect(result.success).toBe(true);
  });

  it('rejects a whitespace-only name instead of passing min(2)', () => {
    // Two spaces are length 2, so `min(2)` alone passes — the client showed
    // no field error and the server answered with a generic message. Trim
    // first so the field errors right where the user is typing.
    const result = signupSchema.safeParse({ ...VALID_SIGNUP, name: '  ' });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0].path).toEqual(['name']);
    expect(result.error?.issues[0].message).toMatch(/at least 2/);
  });

  it('rejects a name of only spaces and tabs', () => {
    const result = signupSchema.safeParse({ ...VALID_SIGNUP, name: ' \t ' });
    expect(result.success).toBe(false);
  });

  it('trims surrounding whitespace from a real name', () => {
    const result = signupSchema.safeParse({
      ...VALID_SIGNUP,
      name: '  Maria Santos  ',
    });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.name).toBe('Maria Santos');
  });
});

describe('serverSignupSchema name', () => {
  it('rejects a whitespace-only name', () => {
    const result = serverSignupSchema.safeParse({
      email: 'owner@example.com',
      password: 'StrongPass123',
      name: '   ',
      role: 'business_owner',
    });
    expect(result.success).toBe(false);
  });
});

describe('updateCurrentUserProfileSchema full_name', () => {
  it('rejects a whitespace-only full_name', () => {
    const result = updateCurrentUserProfileSchema.safeParse({
      full_name: '   ',
    });
    expect(result.success).toBe(false);
  });

  it('trims a padded full_name', () => {
    const result = updateCurrentUserProfileSchema.safeParse({
      full_name: '  Juan Dela Cruz  ',
    });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.full_name).toBe('Juan Dela Cruz');
  });
});
