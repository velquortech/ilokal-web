import { describe, it, expect } from 'vitest';

import {
  isProtectedPath,
  roleAllowedForPath,
  PROTECTED_ROUTE_PREFIXES,
  API_PROTECTED_PREFIXES,
} from '@/lib/utils/protectedRoutes';

describe('protectedRoutes helpers', () => {
  it('returns false for empty or non-protected paths', () => {
    expect(isProtectedPath('')).toBe(false);
    expect(isProtectedPath('/public')).toBe(false);
    expect(isProtectedPath('/about?ref=home')).toBe(false);
  });

  it('detects page-level protected prefixes', () => {
    const adminPrefix = PROTECTED_ROUTE_PREFIXES[0];
    const businessPrefix = PROTECTED_ROUTE_PREFIXES[1];

    expect(isProtectedPath(adminPrefix)).toBe(true);
    expect(isProtectedPath(`${adminPrefix}/settings`)).toBe(true);
    expect(isProtectedPath(`${businessPrefix}/123`)).toBe(true);
  });

  it('detects API protected prefixes', () => {
    const apiPrefix = API_PROTECTED_PREFIXES[0];
    expect(isProtectedPath(`${apiPrefix}/some-endpoint`)).toBe(true);
  });

  it('allows roles for public paths', () => {
    expect(roleAllowedForPath(null, '/public')).toBe(true);
  });

  it('enforces admin-only for admin pages', () => {
    const adminPrefix = PROTECTED_ROUTE_PREFIXES[0];
    expect(roleAllowedForPath('admin', adminPrefix)).toBe(true);
    expect(roleAllowedForPath('business_owner', adminPrefix)).toBe(false);
    expect(roleAllowedForPath(null, adminPrefix)).toBe(false);
  });

  it('allows business_owner and admin for business pages', () => {
    const businessPrefix = PROTECTED_ROUTE_PREFIXES[1];
    expect(roleAllowedForPath('business_owner', businessPrefix)).toBe(true);
    expect(roleAllowedForPath('admin', businessPrefix)).toBe(true);
    expect(roleAllowedForPath('user', businessPrefix)).toBe(false);
  });

  it('requires authentication for API protected prefixes', () => {
    const apiPrefix = API_PROTECTED_PREFIXES[0];
    expect(roleAllowedForPath(null, `${apiPrefix}/x`)).toBe(false);
    expect(roleAllowedForPath('user', `${apiPrefix}/x`)).toBe(true);
  });
});
