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

import { getBusinessesMissingMenu } from '../menuFollowUpQuery';

const RPC_ROW = {
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

beforeEach(() => {
  vi.clearAllMocks();
  getCurrentUser.mockResolvedValue({ id: 'admin-1', role: 'admin' });
  rpc.mockResolvedValue({ data: [RPC_ROW], error: null });
  (createAnalyticsSupabaseClient as Mock).mockResolvedValue({ rpc });
});

describe('getBusinessesMissingMenu — authorization', () => {
  /**
   * The service-role client reads every owner's email, so admin is proved
   * FIRST — and a non-admin caller must never reach the RPC at all.
   */
  it('refuses a non-admin without touching the service-role client', async () => {
    getCurrentUser.mockResolvedValue({ id: 'u', role: 'business_owner' });

    const result = await getBusinessesMissingMenu();

    expect(result).toEqual({ rows: [], failed: false });
    expect(createAnalyticsSupabaseClient).not.toHaveBeenCalled();
    expect(rpc).not.toHaveBeenCalled();
  });

  it('refuses an anonymous caller', async () => {
    getCurrentUser.mockResolvedValue(null);

    const result = await getBusinessesMissingMenu();

    expect(result.rows).toEqual([]);
    expect(rpc).not.toHaveBeenCalled();
  });
});

describe('getBusinessesMissingMenu — the read', () => {
  it('calls the RPC and maps its rows', async () => {
    const result = await getBusinessesMissingMenu();

    expect(rpc).toHaveBeenCalledWith('admin_businesses_missing_menu', {
      p_search: undefined,
      p_only_no_promo: false,
    });
    expect(result.failed).toBe(false);
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0]).toMatchObject({
      id: 'biz-1',
      owner_email: 'owner@x.co',
      offering_noun: 'Menu',
      has_live_menu: false,
    });
  });

  it('passes search and the promo filter through, trimmed', async () => {
    await getBusinessesMissingMenu({ search: '  Café  ', onlyNoPromo: true });

    expect(rpc).toHaveBeenCalledWith('admin_businesses_missing_menu', {
      p_search: 'Café',
      p_only_no_promo: true,
    });
  });

  it('reports a failure distinctly from an empty list', async () => {
    rpc.mockResolvedValue({ data: null, error: { message: 'boom' } });

    const result = await getBusinessesMissingMenu();

    // `failed` is the whole point — an outage must not read as "no shops".
    expect(result).toEqual({ rows: [], failed: true });
  });

  it('returns an empty, NON-failed list when the RPC finds nothing', async () => {
    rpc.mockResolvedValue({ data: [], error: null });

    const result = await getBusinessesMissingMenu();

    expect(result).toEqual({ rows: [], failed: false });
  });

  it('never throws — a dead client is a failure, not an exception', async () => {
    (createAnalyticsSupabaseClient as Mock).mockRejectedValue(
      new Error('down'),
    );

    const result = await getBusinessesMissingMenu();

    expect(result.failed).toBe(true);
  });
});
