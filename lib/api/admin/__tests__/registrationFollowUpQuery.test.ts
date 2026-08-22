import { describe, it, expect, vi, beforeEach, Mock } from 'vitest';

const { getCurrentUser, rpc, createAnalyticsSupabaseClient } = vi.hoisted(
  () => ({
    getCurrentUser: vi.fn(),
    rpc: vi.fn(),
    createAnalyticsSupabaseClient: vi.fn(),
  }),
);

vi.mock('@/lib/api/getCurrentUser', () => ({ getCurrentUser }));
vi.mock('@/supabase/server', () => ({ createAnalyticsSupabaseClient }));

import {
  getOwnersMissingBusiness,
  getOwnersMissingBusinessIds,
} from '../registrationFollowUpQuery';

const LIST_ROW = {
  id: 'owner-1',
  owner_email: 'owner@x.co',
  owner_name: 'Ana',
  signed_up_at: '2026-08-05T00:00:00Z',
  furthest_step: 4,
  last_activity_at: '2026-08-06T00:00:00Z',
  had_business: false,
  registration_reminder_sent_at: null,
};

/** Routes each RPC name to its own result. */
function mockRpc(byName: Record<string, { data: unknown; error: unknown }>) {
  rpc.mockImplementation((name: string) =>
    Promise.resolve(byName[name] ?? { data: null, error: null }),
  );
  (createAnalyticsSupabaseClient as Mock).mockResolvedValue({ rpc });
}

beforeEach(() => {
  vi.clearAllMocks();
  getCurrentUser.mockResolvedValue({ id: 'admin-1', role: 'admin' });
});

describe('getOwnersMissingBusiness — authorization', () => {
  it('refuses a non-admin without touching the service-role client', async () => {
    getCurrentUser.mockResolvedValue({ id: 'u', role: 'business_owner' });

    const result = await getOwnersMissingBusiness({});

    expect(result.rows).toEqual([]);
    // Not `failed`: refusing is not an outage.
    expect(result.failed).toBe(false);
    expect(createAnalyticsSupabaseClient).not.toHaveBeenCalled();
  });

  it('refuses an unauthenticated caller', async () => {
    getCurrentUser.mockResolvedValue(null);
    const result = await getOwnersMissingBusiness({});
    expect(createAnalyticsSupabaseClient).not.toHaveBeenCalled();
    expect(result.total).toBe(0);
  });
});

describe('getOwnersMissingBusiness — the paginated read', () => {
  it('requests one page and takes totals from the stats RPC', async () => {
    mockRpc({
      admin_owners_missing_business: { data: [LIST_ROW], error: null },
      admin_owners_missing_business_stats: {
        data: [{ total: 20, started: 3, reminded: 1 }],
        error: null,
      },
    });

    const result = await getOwnersMissingBusiness({
      search: '  Ana  ',
      onlyStarted: true,
      page: 3,
      pageSize: 10,
    });

    expect(rpc).toHaveBeenCalledWith('admin_owners_missing_business', {
      p_search: 'Ana',
      p_only_started: true,
      p_limit: 10,
      p_offset: 20,
    });
    // Totals must come from the uncapped COUNT, never from the page length.
    expect(result.total).toBe(20);
    expect(result.started).toBe(3);
    expect(result.reminded).toBe(1);
    expect(result.rows).toHaveLength(1);
  });

  it('treats a blank search as no filter', async () => {
    mockRpc({
      admin_owners_missing_business: { data: [], error: null },
      admin_owners_missing_business_stats: { data: [], error: null },
    });

    await getOwnersMissingBusiness({ search: '   ' });

    expect(rpc).toHaveBeenCalledWith(
      'admin_owners_missing_business',
      expect.objectContaining({ p_search: undefined }),
    );
  });

  it('keeps a null furthest_step NULL — it must not become step 0', async () => {
    // The funnel table only began recording on 2026-08-15, so NULL means "we
    // never saw them". `Number(null)` would render that as step 0, a step the
    // wizard does not have.
    mockRpc({
      admin_owners_missing_business: {
        data: [{ ...LIST_ROW, furthest_step: null }],
        error: null,
      },
      admin_owners_missing_business_stats: {
        data: [{ total: 1, started: 0, reminded: 0 }],
        error: null,
      },
    });

    const result = await getOwnersMissingBusiness({});

    expect(result.rows[0].furthest_step).toBeNull();
  });

  it('reports failed on an RPC error, distinct from an empty list', async () => {
    mockRpc({
      admin_owners_missing_business: {
        data: null,
        error: { code: '42883', message: 'no such function' },
      },
      admin_owners_missing_business_stats: { data: [], error: null },
    });

    const result = await getOwnersMissingBusiness({});

    expect(result.failed).toBe(true);
    expect(result.rows).toEqual([]);
    // Zeros with `failed` set are rendered as an em dash, never as "nobody
    // needs a nudge".
    expect(result.total).toBe(0);
  });

  it('reports failed when only the STATS read errors', async () => {
    mockRpc({
      admin_owners_missing_business: { data: [LIST_ROW], error: null },
      admin_owners_missing_business_stats: {
        data: null,
        error: { code: 'XX000', message: 'boom' },
      },
    });

    const result = await getOwnersMissingBusiness({});

    expect(result.failed).toBe(true);
  });
});

describe('getOwnersMissingBusinessIds', () => {
  it('returns the server-derived id array', async () => {
    mockRpc({
      admin_owners_missing_business_ids: {
        data: ['a', 'b', 'c'],
        error: null,
      },
    });

    const ids = await getOwnersMissingBusinessIds({ onlyStarted: true });

    expect(ids).toEqual(['a', 'b', 'c']);
    expect(rpc).toHaveBeenCalledWith('admin_owners_missing_business_ids', {
      p_search: undefined,
      p_only_started: true,
    });
  });

  it('returns [] for a non-admin, so "send to all" sends nothing', async () => {
    getCurrentUser.mockResolvedValue({ id: 'u', role: 'app_user' });
    expect(await getOwnersMissingBusinessIds({})).toEqual([]);
    expect(createAnalyticsSupabaseClient).not.toHaveBeenCalled();
  });

  it('returns [] on error rather than throwing into the action', async () => {
    mockRpc({
      admin_owners_missing_business_ids: {
        data: null,
        error: { message: 'boom' },
      },
    });
    expect(await getOwnersMissingBusinessIds({})).toEqual([]);
  });
});
