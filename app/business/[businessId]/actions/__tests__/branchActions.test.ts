import { describe, it, expect, vi, beforeEach } from 'vitest';
import type {
  ApiResponse,
  Branch,
  BranchStats,
  PaginatedBranchesResponse,
} from '@/lib/types';
import { verifyBusinessOwner } from '@/lib/api/verifyBusinessOwner';
import * as branchQuery from '@/lib/api/branches/branchQuery';

vi.mock('@/lib/api/verifyBusinessOwner');
vi.mock('@/lib/api/branches/branchQuery');
vi.mock('@/lib/api/branches/branchService');
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));

import {
  getBusinessBranchesAction,
  getBusinessBranchStatsAction,
  createBranchAction,
  updateBranchAction,
  deleteBranchAction,
} from '../branchActions';

const BUSINESS_ID = 'biz-00000000-0000-0000-0000-000000000001';
const BRANCH_ID = 'br-00000000-0000-0000-0000-000000000001';

const authorized = {
  authorized: true as const,
  business: { id: BUSINESS_ID },
  user: { id: 'user-1' },
};
const unauthorized = {
  authorized: false as const,
  error: { code: 'UNAUTHORIZED', message: 'Not authorized' },
};

function mockAuthorized() {
  vi.mocked(verifyBusinessOwner).mockResolvedValue(
    authorized as unknown as Awaited<ReturnType<typeof verifyBusinessOwner>>,
  );
}
function mockUnauthorized() {
  vi.mocked(verifyBusinessOwner).mockResolvedValue(
    unauthorized as unknown as Awaited<ReturnType<typeof verifyBusinessOwner>>,
  );
}

const makeBranch = (overrides: Partial<Branch> = {}): Branch => ({
  id: BRANCH_ID,
  business_id: BUSINESS_ID,
  name: 'Main Branch',
  address: '123 Iznart St.',
  location: { type: 'Point', coordinates: [122.5649, 10.6973] },
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  archived_at: null,
  ...overrides,
});

// ===== getBusinessBranchesAction =====

describe('getBusinessBranchesAction', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuthorized();
  });

  it('returns error when not authorized', async () => {
    mockUnauthorized();
    const res = await getBusinessBranchesAction({});
    expect(res.success).toBe(false);
    expect(res.error?.code).toBe('UNAUTHORIZED');
  });

  it('returns paginated branches when authorized', async () => {
    const mockResult = {
      branches: [makeBranch()],
      total: 1,
      page: 1,
      per_page: 10,
      total_pages: 1,
    };
    vi.mocked(branchQuery.getBranchesByBusinessId).mockResolvedValueOnce(
      mockResult,
    );

    const res = await getBusinessBranchesAction({ page: 1, per_page: 10 });
    expect(res.success).toBe(true);
    expect(
      (res as ApiResponse<PaginatedBranchesResponse>).data?.branches,
    ).toHaveLength(1);
  });

  it('returns empty list when business has no branches', async () => {
    vi.mocked(branchQuery.getBranchesByBusinessId).mockResolvedValueOnce({
      branches: [],
      total: 0,
      page: 1,
      per_page: 10,
      total_pages: 0,
    });

    const res = await getBusinessBranchesAction({});
    expect(res.success).toBe(true);
    expect(
      (res as ApiResponse<PaginatedBranchesResponse>).data?.branches,
    ).toHaveLength(0);
  });

  it('returns INTERNAL_ERROR when query layer fails', async () => {
    vi.mocked(branchQuery.getBranchesByBusinessId).mockResolvedValueOnce({
      branches: [],
      total: 0,
      error: 'DB connection failed',
    });

    const res = await getBusinessBranchesAction({});
    expect(res.success).toBe(false);
    expect(res.error?.code).toBe('INTERNAL_ERROR');
  });

  it('forwards search and sort filters to query', async () => {
    const mockResult = {
      branches: [makeBranch()],
      total: 1,
      page: 1,
      per_page: 10,
      total_pages: 1,
    };
    vi.mocked(branchQuery.getBranchesByBusinessId).mockResolvedValueOnce(
      mockResult,
    );

    await getBusinessBranchesAction({ search: 'main', sort_by: 'newest' });

    expect(branchQuery.getBranchesByBusinessId).toHaveBeenCalledWith(
      BUSINESS_ID,
      expect.objectContaining({ search: 'main', sort_by: 'newest' }),
    );
  });
});

// ===== getBusinessBranchStatsAction =====

describe('getBusinessBranchStatsAction', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuthorized();
  });

  it('returns error when not authorized', async () => {
    mockUnauthorized();
    const res = await getBusinessBranchStatsAction();
    expect(res.success).toBe(false);
  });

  it('counts branches with and without location correctly', async () => {
    vi.mocked(branchQuery.getBranchesByBusinessId).mockResolvedValueOnce({
      branches: [
        makeBranch({ location: { type: 'Point', coordinates: [122, 10] } }),
        makeBranch({ id: 'br-2', location: null }),
        makeBranch({
          id: 'br-3',
          location: { type: 'Point', coordinates: [123, 11] },
        }),
      ],
      total: 3,
      page: 1,
      per_page: 1000,
      total_pages: 1,
    });

    const res = await getBusinessBranchStatsAction();
    expect(res.success).toBe(true);
    const stats = (res as ApiResponse<BranchStats>).data!;
    expect(stats.total).toBe(3);
    expect(stats.with_location).toBe(2);
    expect(stats.without_location).toBe(1);
  });

  it('returns zeros when no branches exist', async () => {
    vi.mocked(branchQuery.getBranchesByBusinessId).mockResolvedValueOnce({
      branches: [],
      total: 0,
      page: 1,
      per_page: 1000,
      total_pages: 0,
    });

    const res = await getBusinessBranchStatsAction();
    expect(res.success).toBe(true);
    const stats = (res as ApiResponse<BranchStats>).data!;
    expect(stats.total).toBe(0);
    expect(stats.with_location).toBe(0);
    expect(stats.without_location).toBe(0);
  });
});

// ===== createBranchAction =====

describe('createBranchAction', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuthorized();
  });

  it('returns VALIDATION_ERROR when name is missing', async () => {
    const res = await createBranchAction({ name: '', address: '123 St.' });
    expect(res.success).toBe(false);
    expect(res.error?.code).toBe('VALIDATION_ERROR');
  });

  it('returns VALIDATION_ERROR when address is missing', async () => {
    const res = await createBranchAction({ name: 'Branch', address: '' });
    expect(res.success).toBe(false);
    expect(res.error?.code).toBe('VALIDATION_ERROR');
  });

  it('returns error when not authorized', async () => {
    mockUnauthorized();
    const res = await createBranchAction({
      name: 'Branch',
      address: '123 St.',
    });
    expect(res.success).toBe(false);
  });
});

// ===== deleteBranchAction =====

describe('deleteBranchAction', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuthorized();
  });

  it('returns NOT_FOUND when branch does not exist', async () => {
    vi.mocked(branchQuery.getBranchById).mockResolvedValueOnce({
      error: 'Branch not found',
    });

    const res = await deleteBranchAction(BRANCH_ID);
    expect(res.success).toBe(false);
    expect(res.error?.code).toBe('NOT_FOUND');
  });

  it('returns AUTHORIZATION_ERROR when branch belongs to different business', async () => {
    vi.mocked(branchQuery.getBranchById).mockResolvedValueOnce({
      branch: makeBranch({ business_id: 'other-biz-id' }) as Branch,
    });

    const res = await deleteBranchAction(BRANCH_ID);
    expect(res.success).toBe(false);
    expect(res.error?.code).toBe('AUTHORIZATION_ERROR');
  });
});

// ===== updateBranchAction =====

describe('updateBranchAction', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuthorized();
  });

  it('returns NOT_FOUND when branch does not exist', async () => {
    vi.mocked(branchQuery.getBranchById).mockResolvedValueOnce({
      error: 'Branch not found',
    });

    const res = await updateBranchAction(BRANCH_ID, { name: 'Updated' });
    expect(res.success).toBe(false);
    expect(res.error?.code).toBe('NOT_FOUND');
  });

  it('returns AUTHORIZATION_ERROR when branch belongs to different business', async () => {
    vi.mocked(branchQuery.getBranchById).mockResolvedValueOnce({
      branch: makeBranch({ business_id: 'other-biz-id' }) as Branch,
    });

    const res = await updateBranchAction(BRANCH_ID, { name: 'Updated' });
    expect(res.success).toBe(false);
    expect(res.error?.code).toBe('AUTHORIZATION_ERROR');
  });
});
