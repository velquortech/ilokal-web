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
} from '../routeConfig';

const ADMIN_ID = '11111111-1111-1111-1111-111111111111';

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
