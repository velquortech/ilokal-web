import { describe, it, expect, vi, beforeEach } from 'vitest';
import type {
  ApiResponse,
  Branch,
  BranchStats,
  PaginatedBranchesResponse,
} from '@/lib/types';
import { verifyBusinessOwner } from '@/lib/api/verifyBusinessOwner';
import * as branchQuery from '@/lib/api/branches/branchQuery';
import * as branchService from '@/lib/api/branches/branchService';
import { revalidatePath } from 'next/cache';

vi.mock('@/lib/api/verifyBusinessOwner');
vi.mock('@/lib/api/branches/branchQuery');
vi.mock('@/lib/api/branches/branchService');
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));

import {
  getBusinessBranchesAction,
  getBusinessBranchStatsAction,
  getBusinessBranchByIdAction,
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
  phone: null,
  email: null,
  description: null,
  status: 'active',
  rejection_reason: null,
  cover_image_url: null,
  gallery_images: [],
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  archived_at: null,
  ...overrides,
});

const makePaginatedResult = (branches: Branch[] = [makeBranch()]) => ({
  branches,
  total: branches.length,
  page: 1,
  per_page: 10,
  total_pages: Math.ceil(branches.length / 10),
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
    vi.mocked(branchQuery.getBranchesByBusinessId).mockResolvedValueOnce(
      makePaginatedResult([makeBranch()]),
    );
    const res = await getBusinessBranchesAction({ page: 1, per_page: 10 });
    expect(res.success).toBe(true);
    expect(
      (res as ApiResponse<PaginatedBranchesResponse>).data?.branches,
    ).toHaveLength(1);
  });

  it('returns empty list when business has no branches', async () => {
    vi.mocked(branchQuery.getBranchesByBusinessId).mockResolvedValueOnce(
      makePaginatedResult([]),
    );
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
    vi.mocked(branchQuery.getBranchesByBusinessId).mockResolvedValueOnce(
      makePaginatedResult(),
    );
    await getBusinessBranchesAction({ search: 'main', sort_by: 'newest' });
    expect(branchQuery.getBranchesByBusinessId).toHaveBeenCalledWith(
      BUSINESS_ID,
      expect.objectContaining({ search: 'main', sort_by: 'newest' }),
    );
  });

  it('defaults status to "all" when not provided', async () => {
    vi.mocked(branchQuery.getBranchesByBusinessId).mockResolvedValueOnce(
      makePaginatedResult([]),
    );
    await getBusinessBranchesAction({});
    expect(branchQuery.getBranchesByBusinessId).toHaveBeenCalledWith(
      BUSINESS_ID,
      expect.objectContaining({ status: 'all' }),
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

  it('returns INTERNAL_ERROR when query fails', async () => {
    vi.mocked(branchQuery.getBranchesByBusinessId).mockResolvedValueOnce({
      branches: [],
      total: 0,
      error: 'DB connection failed',
    });
    const res = await getBusinessBranchStatsAction();
    expect(res.success).toBe(false);
    expect(res.error?.code).toBe('INTERNAL_ERROR');
  });
});

// ===== getBusinessBranchByIdAction =====

describe('getBusinessBranchByIdAction', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuthorized();
  });

  it('returns error when not authorized', async () => {
    mockUnauthorized();
    const res = await getBusinessBranchByIdAction(BRANCH_ID);
    expect(res.success).toBe(false);
  });

  it('returns NOT_FOUND when branch does not exist', async () => {
    vi.mocked(branchQuery.getBranchById).mockResolvedValueOnce({
      error: 'Branch not found',
    });
    const res = await getBusinessBranchByIdAction(BRANCH_ID);
    expect(res.success).toBe(false);
    expect(res.error?.code).toBe('NOT_FOUND');
  });

  it('returns AUTHORIZATION_ERROR when branch belongs to a different business', async () => {
    vi.mocked(branchQuery.getBranchById).mockResolvedValueOnce({
      branch: makeBranch({ business_id: 'other-biz-id' }) as Branch,
    });
    const res = await getBusinessBranchByIdAction(BRANCH_ID);
    expect(res.success).toBe(false);
    expect(res.error?.code).toBe('AUTHORIZATION_ERROR');
  });

  it('returns branch data when authorized and found', async () => {
    const branch = makeBranch();
    vi.mocked(branchQuery.getBranchById).mockResolvedValueOnce({ branch });
    const res = await getBusinessBranchByIdAction(BRANCH_ID);
    expect(res.success).toBe(true);
    expect((res as ApiResponse<Branch>).data?.id).toBe(BRANCH_ID);
    expect((res as ApiResponse<Branch>).data?.name).toBe('Main Branch');
  });
});

// ===== createBranchAction =====

describe('createBranchAction', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuthorized();
  });

  it('returns error when not authorized', async () => {
    mockUnauthorized();
    const res = await createBranchAction({ name: 'Branch', address: '123 St.' });
    expect(res.success).toBe(false);
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

  it('returns branch data and calls revalidatePath on success', async () => {
    const branch = makeBranch();
    vi.mocked(branchService.createBranch).mockResolvedValueOnce({
      success: true,
      data: branch,
    });
    const res = await createBranchAction({
      name: 'Main Branch',
      address: '123 Iznart St.',
    });
    expect(res.success).toBe(true);
    expect((res as ApiResponse<Branch>).data?.name).toBe('Main Branch');
    expect(revalidatePath).toHaveBeenCalledWith(
      `/business/${BUSINESS_ID}/branches`,
    );
  });

  it('propagates INTERNAL_ERROR from service layer', async () => {
    vi.mocked(branchService.createBranch).mockResolvedValueOnce({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to create branch' },
    });
    const res = await createBranchAction({
      name: 'Branch',
      address: '123 St.',
    });
    expect(res.success).toBe(false);
    expect(res.error?.code).toBe('INTERNAL_ERROR');
  });
});

// ===== updateBranchAction =====

describe('updateBranchAction', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuthorized();
  });

  it('returns error when not authorized', async () => {
    mockUnauthorized();
    const res = await updateBranchAction(BRANCH_ID, { name: 'Updated' });
    expect(res.success).toBe(false);
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

  it('returns updated branch and calls revalidatePath on success', async () => {
    const updated = makeBranch({ name: 'Updated Branch' });
    vi.mocked(branchQuery.getBranchById).mockResolvedValueOnce({
      branch: makeBranch(),
    });
    vi.mocked(branchService.updateBranch).mockResolvedValueOnce({
      success: true,
      data: updated,
    });
    const res = await updateBranchAction(BRANCH_ID, { name: 'Updated Branch' });
    expect(res.success).toBe(true);
    expect((res as ApiResponse<Branch>).data?.name).toBe('Updated Branch');
    expect(revalidatePath).toHaveBeenCalledWith(
      `/business/${BUSINESS_ID}/branches`,
    );
  });

  it('propagates INTERNAL_ERROR from service layer', async () => {
    vi.mocked(branchQuery.getBranchById).mockResolvedValueOnce({
      branch: makeBranch(),
    });
    vi.mocked(branchService.updateBranch).mockResolvedValueOnce({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to update branch' },
    });
    const res = await updateBranchAction(BRANCH_ID, { name: 'Updated' });
    expect(res.success).toBe(false);
    expect(res.error?.code).toBe('INTERNAL_ERROR');
  });
});

// ===== deleteBranchAction =====

describe('deleteBranchAction', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuthorized();
  });

  it('returns error when not authorized', async () => {
    mockUnauthorized();
    const res = await deleteBranchAction(BRANCH_ID);
    expect(res.success).toBe(false);
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

  it('returns success and calls revalidatePath on delete', async () => {
    vi.mocked(branchQuery.getBranchById).mockResolvedValueOnce({
      branch: makeBranch(),
    });
    vi.mocked(branchService.deleteBranch).mockResolvedValueOnce({
      success: true,
      data: null,
    });
    const res = await deleteBranchAction(BRANCH_ID);
    expect(res.success).toBe(true);
    expect(revalidatePath).toHaveBeenCalledWith(
      `/business/${BUSINESS_ID}/branches`,
    );
  });

  it('propagates INTERNAL_ERROR from service layer', async () => {
    vi.mocked(branchQuery.getBranchById).mockResolvedValueOnce({
      branch: makeBranch(),
    });
    vi.mocked(branchService.deleteBranch).mockResolvedValueOnce({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to delete branch' },
    });
    const res = await deleteBranchAction(BRANCH_ID);
    expect(res.success).toBe(false);
    expect(res.error?.code).toBe('INTERNAL_ERROR');
  });
});
