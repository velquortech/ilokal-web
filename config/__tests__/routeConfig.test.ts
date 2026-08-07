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
  adminMenuFollowUpPath,
  landingSectionPath,
  loginPathForPathname,
  ROUTES,
  businessRedeemedCouponsPath,
  businessEventsPath,
  adminEventsPath,
  eventPath,
  businessWelcomePath,
  businessPathWithoutWelcome,
  businessAddOfferingPath,
  businessProductCataloguesPath,
  cataloguePathWithoutAdd,
  CATALOGUE_ADD_PARAM,
  ONBOARDING_WELCOME_PARAM,
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

  it('adminMenuFollowUpPath targets the menu-follow-up page', () => {
    expect(adminMenuFollowUpPath(ADMIN_ID)).toBe(
      `/admin/${ADMIN_ID}/menu-follow-up`,
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
    // These must be sections the landing actually renders. The redesign
    // renamed `#shoppers` → `#near-you` and `#about` → `#voices` and deleted
    // `#how`; asserting against the retired names kept this green while the
    // links it exists to protect pointed nowhere.
    expect(landingSectionPath('voices')).toBe('/home#voices');
    expect(landingSectionPath('near-you')).toBe('/home#near-you');
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

describe('event routes', () => {
  it('builds the public event path from the collection constant', () => {
    expect(eventPath('abc-123')).toBe('/events/abc-123');
    expect(eventPath('abc-123').startsWith(ROUTES.EVENTS.HOME)).toBe(true);
  });

  it('uses the plural collection every other route uses', () => {
    // `/event/:id` exists only as a redirect (next.config.ts). Every dynamic
    // segment in this app is camelCase and every collection is plural.
    expect(ROUTES.EVENTS.HOME).toBe('/events');
    expect(ROUTES.EVENTS.NEARBY).toBe('/events/nearby');
  });

  it('builds the shop and admin event surfaces', () => {
    expect(businessEventsPath('biz-1')).toBe('/business/biz-1/events');
    expect(adminEventsPath('admin-1')).toBe('/admin/admin-1/events');
  });
});

describe('onboarding welcome marker', () => {
  it('appends the marker to the shop path, not to /business', () => {
    // `/business` resolves through a `redirect()`, which drops every search
    // param — a marker put there would never reach the dashboard.
    expect(businessWelcomePath('biz-1')).toBe(
      `/business/biz-1?${ONBOARDING_WELCOME_PARAM}=1`,
    );
  });

  it('strips only the marker, keeping every other param', () => {
    expect(
      businessPathWithoutWelcome('biz-1', {
        [ONBOARDING_WELCOME_PARAM]: '1',
        branch: 'branch-9',
      }),
    ).toBe('/business/biz-1?branch=branch-9');
  });

  it('leaves a bare path when the marker was the only param', () => {
    expect(
      businessPathWithoutWelcome('biz-1', { [ONBOARDING_WELCOME_PARAM]: '1' }),
    ).toBe('/business/biz-1');
  });

  it('keeps repeated params and drops undefined ones', () => {
    expect(
      businessPathWithoutWelcome('biz-1', {
        tag: ['a', 'b'],
        empty: undefined,
      }),
    ).toBe('/business/biz-1?tag=a&tag=b');
  });
});

describe('catalogue add marker', () => {
  it('lands on the catalogue with the add dialog flagged open', () => {
    expect(businessAddOfferingPath('biz-1')).toBe(
      `/business/biz-1/product-catalogues?${CATALOGUE_ADD_PARAM}=1`,
    );
  });

  it('builds on the catalogue path rather than restating the segment', () => {
    // A second literal `product-catalogues` here is how a rename turns one of
    // these two into a 404 while the other keeps working.
    expect(businessAddOfferingPath('biz-1')).toContain(
      businessProductCataloguesPath('biz-1'),
    );
  });

  it('strips only the marker, keeping search, filters and page', () => {
    // Consuming the marker must not reset the owner's view — the same rule
    // the welcome marker follows for `?branch=`.
    expect(
      cataloguePathWithoutAdd(
        'biz-1',
        new URLSearchParams({
          [CATALOGUE_ADD_PARAM]: '1',
          search: 'adobo',
          page: '3',
          section: 'sec-9',
        }),
      ),
    ).toBe(
      '/business/biz-1/product-catalogues?search=adobo&page=3&section=sec-9',
    );
  });

  it('leaves a bare path when the marker was the only param', () => {
    expect(
      cataloguePathWithoutAdd(
        'biz-1',
        new URLSearchParams({ [CATALOGUE_ADD_PARAM]: '1' }),
      ),
    ).toBe('/business/biz-1/product-catalogues');
  });

  it('does not mutate the caller’s params', () => {
    // `useSearchParams()` returns a live object the router also reads; deleting
    // from it in place would edit state this function does not own.
    const params = new URLSearchParams({ [CATALOGUE_ADD_PARAM]: '1' });
    cataloguePathWithoutAdd('biz-1', params);
    expect(params.get(CATALOGUE_ADD_PARAM)).toBe('1');
  });

  it('is a no-op for a URL that never carried the marker', () => {
    expect(
      cataloguePathWithoutAdd('biz-1', new URLSearchParams({ page: '2' })),
    ).toBe('/business/biz-1/product-catalogues?page=2');
  });
});
