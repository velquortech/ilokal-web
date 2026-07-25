import { describe, it, expect } from 'vitest';

import {
  isProtectedPath,
  roleAllowedForPath,
  PROTECTED_ROUTE_PREFIXES,
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

  it('returns false for /api routes (guarded at handler level via assertAuthorized)', () => {
    expect(isProtectedPath('/api/admin/businesses')).toBe(false);
    expect(isProtectedPath('/api/web/billing/invoices')).toBe(false);
    expect(isProtectedPath('/api/protected/mobile/subscriptions')).toBe(false);
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
});

describe('customer area (/customer) rules', () => {
  it('is a protected prefix', () => {
    expect(isProtectedPath('/customer')).toBe(true);
    expect(isProtectedPath('/customer/wallet')).toBe(true);
    expect(isProtectedPath('/customer/following?page=2')).toBe(true);
  });

  it('allows only app_user', () => {
    expect(roleAllowedForPath('app_user', '/customer/wallet')).toBe(true);
    expect(roleAllowedForPath('admin', '/customer/wallet')).toBe(false);
    expect(roleAllowedForPath('business_owner', '/customer')).toBe(false);
    expect(roleAllowedForPath(null, '/customer')).toBe(false);
  });

  it('keeps /explore public (not a protected prefix)', () => {
    expect(isProtectedPath('/explore')).toBe(false);
    expect(isProtectedPath('/explore/abc-123')).toBe(false);
  });

  it('does not let app_user into the other portals', () => {
    expect(roleAllowedForPath('app_user', '/admin')).toBe(false);
    expect(roleAllowedForPath('app_user', '/business/xyz')).toBe(false);
  });
});
