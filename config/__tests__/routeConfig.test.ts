/**
 * Route Config — admin path helper tests
 * Mirrors the behaviour expected of businessPath: segment joins, empty-segment
 * filtering, and the per-page convenience helpers.
 */

import { describe, it, expect } from 'vitest';
import {
  adminPath,
  adminUsersPath,
  adminBranchesPath,
  adminAccountStatusPath,
  landingSectionPath,
  loginPathForPathname,
  ROUTES,
  businessRedeemedCouponsPath,
} from '../routeConfig';

const ADMIN_ID = '11111111-1111-1111-1111-111111111111';
const BUSINESS_ID = '22222222-2222-2222-2222-222222222222';

describe('businessRedeemedCouponsPath', () => {
  it('targets the redeemed-coupons page for a business', () => {
    expect(businessRedeemedCouponsPath(BUSINESS_ID)).toBe(
      `/business/${BUSINESS_ID}/redeemed-coupons`,
    );
  });
});

describe('adminPath', () => {
  it('builds the base path with no extra segments', () => {
    expect(adminPath(ADMIN_ID)).toBe(`/admin/${ADMIN_ID}`);
  });

  it('joins additional segments with slashes', () => {
    expect(adminPath(ADMIN_ID, 'users')).toBe(`/admin/${ADMIN_ID}/users`);
    expect(adminPath(ADMIN_ID, 'branches', 'create')).toBe(
      `/admin/${ADMIN_ID}/branches/create`,
    );
  });

  it('filters out empty segments', () => {
    expect(adminPath(ADMIN_ID, '', 'users', '')).toBe(
      `/admin/${ADMIN_ID}/users`,
    );
  });

  it('produces no double slashes when adminId is empty', () => {
    // filter(Boolean) drops the empty id, mirroring businessPath
    expect(adminPath('', 'users')).toBe('/admin/users');
  });
});

describe('admin per-page helpers', () => {
  it('adminUsersPath targets the users page', () => {
    expect(adminUsersPath(ADMIN_ID)).toBe(`/admin/${ADMIN_ID}/users`);
  });

  it('adminBranchesPath targets the branches page', () => {
    expect(adminBranchesPath(ADMIN_ID)).toBe(`/admin/${ADMIN_ID}/branches`);
  });

  it('adminAccountStatusPath targets the account-status page', () => {
    expect(adminAccountStatusPath(ADMIN_ID)).toBe(
      `/admin/${ADMIN_ID}/account-status`,
    );
  });
});

describe('ROUTES.AUTH sign-in doors', () => {
  it('exposes the unified sign-in door and the gated admin door', () => {
    expect(ROUTES.AUTH.SIGN_IN).toBe('/sign-in');
    expect(ROUTES.AUTH.ADMIN_SIGN_IN).toBe('/sign-in/admin');
  });
});

describe('public landing route', () => {
  it('exposes the landing under PUBLIC', () => {
    expect(ROUTES.PUBLIC.LANDING).toBe('/home');
  });

  it('keeps the no-role dashboard fallback pointed at the same URL', () => {
    // Both are the landing page — declared from one constant so they can't drift.
    expect(ROUTES.DASHBOARD.HOME).toBe(ROUTES.PUBLIC.LANDING);
  });
});

describe('landingSectionPath', () => {
  it('builds an absolute anchor into the landing', () => {
    expect(landingSectionPath('about')).toBe('/home#about');
    expect(landingSectionPath('shoppers')).toBe('/home#shoppers');
  });

  it('never emits a bare hash (which no-ops off the landing)', () => {
    expect(landingSectionPath('deals').startsWith('#')).toBe(false);
    expect(landingSectionPath('deals')).toContain(ROUTES.PUBLIC.LANDING);
  });
});

describe('loginPathForPathname', () => {
  it('sends an admin page to the admin sign-in door', () => {
    expect(loginPathForPathname(`/admin/${ADMIN_ID}/users`)).toBe(
      ROUTES.AUTH.ADMIN_SIGN_IN,
    );
  });

  it('sends a business page to the unified sign-in door', () => {
    expect(loginPathForPathname('/business/biz-1/coupons')).toBe(
      ROUTES.AUTH.SIGN_IN,
    );
  });

  it('sends a customer page to the unified sign-in door', () => {
    expect(loginPathForPathname('/customer/wallet')).toBe(ROUTES.AUTH.SIGN_IN);
  });

  it('falls back to the unified sign-in door outside the dashboards', () => {
    expect(loginPathForPathname('/home')).toBe(ROUTES.AUTH.SIGN_IN);
  });

  it('falls back to the unified sign-in door for a missing pathname', () => {
    expect(loginPathForPathname(null)).toBe(ROUTES.AUTH.SIGN_IN);
    expect(loginPathForPathname(undefined)).toBe(ROUTES.AUTH.SIGN_IN);
  });
});
