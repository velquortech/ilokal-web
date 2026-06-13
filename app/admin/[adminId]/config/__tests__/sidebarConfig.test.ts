/**
 * Admin sidebar config tests
 * Verifies injectAdminId rewrites base admin hrefs to the dynamic segment and
 * leaves external / non-admin hrefs untouched, plus the section structure.
 */

import { describe, it, expect } from 'vitest';
import {
  injectAdminId,
  SIDEBAR_SECTIONS,
  mainNavigation,
  administrationNavigation,
} from '../sidebarConfig';

const ADMIN_ID = '22222222-2222-2222-2222-222222222222';

describe('injectAdminId', () => {
  it('rewrites the dashboard root href', () => {
    expect(injectAdminId('/admin', ADMIN_ID)).toBe(`/admin/${ADMIN_ID}`);
  });

  it('rewrites nested admin hrefs', () => {
    expect(injectAdminId('/admin/users', ADMIN_ID)).toBe(
      `/admin/${ADMIN_ID}/users`,
    );
    expect(injectAdminId('/admin/account-status', ADMIN_ID)).toBe(
      `/admin/${ADMIN_ID}/account-status`,
    );
  });

  it('leaves external hrefs untouched', () => {
    expect(injectAdminId('https://example.com', ADMIN_ID)).toBe(
      'https://example.com',
    );
  });

  it('leaves non-admin app hrefs untouched', () => {
    expect(injectAdminId('/login', ADMIN_ID)).toBe('/login');
    // a path that merely starts with the word "admin" but not the /admin route
    expect(injectAdminId('/administration', ADMIN_ID)).toBe('/administration');
  });

  it('returns the original href when adminId is empty', () => {
    expect(injectAdminId('/admin/users', '')).toBe('/admin/users');
  });
});

describe('SIDEBAR_SECTIONS', () => {
  it('exposes a main section (no header) and an Administration section', () => {
    expect(SIDEBAR_SECTIONS[0].items).toBe(mainNavigation);
    expect(SIDEBAR_SECTIONS[0].header).toBeUndefined();

    const adminSection = SIDEBAR_SECTIONS.find(
      (s) => s.header === 'Administration',
    );
    expect(adminSection?.items).toBe(administrationNavigation);
  });

  it('every nav item uses the canonical NavItem shape (title + base href)', () => {
    const allItems = SIDEBAR_SECTIONS.flatMap((s) => s.items);
    for (const item of allItems) {
      expect(typeof item.title).toBe('string');
      expect(item.icon).toBeTruthy();
      // hrefs are stored as base paths, free of the dynamic segment
      expect(item.href?.startsWith('/admin')).toBe(true);
      expect(item.href).not.toContain('[adminId]');
    }
  });
});
