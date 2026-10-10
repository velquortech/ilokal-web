import { describe, expect, it } from 'vitest';

import { parseSignupRef } from '@/lib/utils/signupRef';

describe('parseSignupRef', () => {
  it('accepts the refs the mobile app sends', () => {
    expect(parseSignupRef('app_profile')).toBe('app_profile');
    expect(parseSignupRef('app_guest')).toBe('app_guest');
  });

  it('rejects anything that would not pass the database CHECK', () => {
    for (const bad of [
      '',
      'App_Profile',
      'app-profile',
      'app profile',
      "app';--",
      'x'.repeat(41),
    ]) {
      expect(parseSignupRef(bad)).toBeNull();
    }
  });

  it('treats a missing value as no ref', () => {
    expect(parseSignupRef(null)).toBeNull();
    expect(parseSignupRef(undefined)).toBeNull();
  });
});
