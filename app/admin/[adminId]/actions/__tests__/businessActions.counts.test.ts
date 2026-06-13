/**
 * getBusinessCountsAction tests.
 * Backs the admin Business Documents status cards (Total / Pending / Verified /
 * Rejected). Verifies it returns real status counts from the query layer, guards
 * on admin auth, and propagates a query error instead of silently returning {}.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

const verifyCurrentUserIsAdmin = vi.fn();
const countBusinessesByStatus = vi.fn();

vi.mock('@/lib/api/admin/adminActionHelpers', () => ({
  verifyCurrentUserIsAdmin: () => verifyCurrentUserIsAdmin(),
}));
vi.mock('@/lib/api/business/businessQuery', () => ({
  countBusinessesByStatus: () => countBusinessesByStatus(),
}));
// businessActions.ts also pulls in the HTTP service at module load; stub it so
// the import graph stays light and node-only.
vi.mock('@/lib/services/businessService', () => ({ default: {} }));

import { getBusinessCountsAction } from '../businessActions';

const COUNTS = {
  pending: 3,
  verified: 7,
  suspended: 1,
  rejected: 2,
  total: 13,
};

beforeEach(() => {
  vi.clearAllMocks();
  verifyCurrentUserIsAdmin.mockResolvedValue({ authorized: true });
  countBusinessesByStatus.mockResolvedValue({ counts: COUNTS, error: null });
});

describe('getBusinessCountsAction', () => {
  it('returns status counts from the query layer', async () => {
    const result = await getBusinessCountsAction();

    expect(countBusinessesByStatus).toHaveBeenCalledOnce();
    expect(result).toEqual({ counts: COUNTS });
  });

  it('blocks non-admins and never queries counts', async () => {
    verifyCurrentUserIsAdmin.mockResolvedValue({
      authorized: false,
      error: 'Only admins can perform this action',
    });

    const result = await getBusinessCountsAction();

    expect(result).toEqual({ error: 'Only admins can perform this action' });
    expect(countBusinessesByStatus).not.toHaveBeenCalled();
  });

  it('propagates a query error instead of returning empty counts', async () => {
    countBusinessesByStatus.mockResolvedValue({
      counts: {},
      error: 'db down',
    });

    const result = await getBusinessCountsAction();

    expect(result).toEqual({ error: 'db down' });
  });

  it('surfaces a thrown error as a failure result', async () => {
    countBusinessesByStatus.mockRejectedValue(new Error('boom'));

    const result = await getBusinessCountsAction();

    expect(result).toEqual({ error: 'boom' });
  });
});
