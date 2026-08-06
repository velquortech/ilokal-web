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
  getBusinessesMissingMenu,
  getMissingMenuIds,
} from '../menuFollowUpQuery';

const LIST_ROW = {
  id: 'biz-1',
  shop_name: 'Pitstop Café',
  owner_email: 'owner@x.co',
  owner_name: 'Ana',
  offering_noun: 'Menu',
  offering_plural: 'Menu Items',
  has_live_menu: false,
  has_live_promo: false,
  menu_reminder_sent_at: null,
  created_at: '2026-01-01T00:00:00Z',
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

describe('getBusinessesMissingMenu — authorization', () => {
  it('refuses a non-admin without touching the service-role client', async () => {
    getCurrentUser.mockResolvedValue({ id: 'u', role: 'business_owner' });

    const result = await getBusinessesMissingMenu({});

    expect(result.rows).toEqual([]);
    expect(result.failed).toBe(false);
    expect(createAnalyticsSupabaseClient).not.toHaveBeenCalled();
  });
});

describe('getBusinessesMissingMenu — the paginated read', () => {
  it('requests a page and reads totals from the stats RPC', async () => {
    mockRpc({
      admin_businesses_missing_menu: { data: [LIST_ROW], error: null },
      admin_businesses_missing_menu_stats: {
        data: [{ total: 42, no_promo: 30, reminded: 5 }],
        error: null,
      },
    });

    const result = await getBusinessesMissingMenu({
      search: '  Café  ',
      onlyNoPromo: true,
      page: 3,
      pageSize: 10,
    });

    // The page RPC gets limit/offset and the trimmed search.
    expect(rpc).toHaveBeenCalledWith('admin_businesses_missing_menu', {
      p_search: 'Café',
      p_only_no_promo: true,
      p_limit: 10,
      p_offset: 20,
    });
    // Totals come from the uncapped COUNT RPC, not from `rows.length`.
    expect(result.total).toBe(42);
    expect(result.noPromo).toBe(30);
    expect(result.reminded).toBe(5);
    expect(result.rows).toHaveLength(1);
    expect(result.failed).toBe(false);
  });

  it('reports a failure distinctly from an empty page', async () => {
    mockRpc({
      admin_businesses_missing_menu: { data: null, error: { message: 'x' } },
      admin_businesses_missing_menu_stats: { data: [], error: null },
    });

    const result = await getBusinessesMissingMenu({});

    expect(result).toMatchObject({ rows: [], total: 0, failed: true });
  });

  it('is empty and NON-failed when nothing matches', async () => {
    mockRpc({
      admin_businesses_missing_menu: { data: [], error: null },
      admin_businesses_missing_menu_stats: {
        data: [{ total: 0, no_promo: 0, reminded: 0 }],
        error: null,
      },
    });

    const result = await getBusinessesMissingMenu({});

    expect(result).toMatchObject({ rows: [], total: 0, failed: false });
  });
});

describe('getMissingMenuIds', () => {
  it('returns the server-derived id array for an admin', async () => {
    mockRpc({
      admin_businesses_missing_menu_ids: {
        data: ['a', 'b', 'c'],
        error: null,
      },
    });

    const ids = await getMissingMenuIds({ search: 'x', onlyNoPromo: false });

    expect(rpc).toHaveBeenCalledWith('admin_businesses_missing_menu_ids', {
      p_search: 'x',
      p_only_no_promo: false,
    });
    expect(ids).toEqual(['a', 'b', 'c']);
  });

  it('returns [] for a non-admin, never reaching the RPC', async () => {
    getCurrentUser.mockResolvedValue({ id: 'u', role: 'business_owner' });

    const ids = await getMissingMenuIds({});

    expect(ids).toEqual([]);
    expect(createAnalyticsSupabaseClient).not.toHaveBeenCalled();
  });

  it('returns [] on a failed read', async () => {
    mockRpc({
      admin_businesses_missing_menu_ids: {
        data: null,
        error: { message: 'boom' },
      },
    });

    expect(await getMissingMenuIds({})).toEqual([]);
  });
});
