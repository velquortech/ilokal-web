/**
 * `getPublicBusinessProfile` — the new `info` block.
 *
 * `business_settings` is owner-only RLS, so this data arrives through the
 * `get_business_public_info` RPC. The contract that matters: the info read is
 * DECORATIVE. A failure renders as "the shop published nothing", never as a
 * broken or missing profile page.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getPublicBusinessProfile } from '@/lib/api/customer/customerQuery';
import { createServerSupabaseClient } from '@/supabase/server';

vi.mock('@/supabase/server', () => ({
  createServerSupabaseClient: vi.fn(),
}));

vi.mock('@/app/api/helpers/storage', () => ({
  resolveStorageUrl: vi.fn((_c: unknown, _b: string, path: unknown) => path),
}));

const BUSINESS_ID = '11111111-1111-1111-1111-111111111104';

const BUSINESS_ROW = {
  id: BUSINESS_ID,
  shop_name: 'Aura Hair Studio',
  description: null,
  logo_url: null,
  banner_url: null,
  interior_images: [],
  business_categories: { name: 'Salon / Barbershop' },
};

const INFO_ROW = {
  operating_hours: { mon: { open: '09:00', close: '18:00', closed: false } },
  social_links: { facebook: 'https://facebook.com/aura' },
  contact_website: 'https://aura.example',
  contact_phone_public: '+63 917 123 4567',
};

/** RPC dispatch keyed by name so each read can fail independently. */
function mockClient(
  rpcResults: Record<string, { data?: unknown; error?: unknown }>,
) {
  const supabase = {
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      is: vi.fn().mockReturnThis(),
      in: vi.fn().mockResolvedValue({ data: [], error: null }),
      maybeSingle: vi
        .fn()
        .mockResolvedValue({ data: BUSINESS_ROW, error: null }),
    }),
    rpc: vi.fn((name: string) =>
      Promise.resolve({
        data: rpcResults[name]?.data ?? null,
        error: rpcResults[name]?.error ?? null,
      }),
    ),
  };

  vi.mocked(createServerSupabaseClient).mockResolvedValue(
    supabase as unknown as Awaited<
      ReturnType<typeof createServerSupabaseClient>
    >,
  );
  return supabase;
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('getPublicBusinessProfile — info block', () => {
  it('returns the four public fields from the RPC', async () => {
    mockClient({
      get_business_public_info: { data: [INFO_ROW] },
      get_business_rating_summary: { data: [] },
      business_branches: { data: [] },
    });

    const result = await getPublicBusinessProfile(BUSINESS_ID);

    if ('error' in result) throw new Error('expected a profile');
    expect(result.business.info).toEqual(INFO_ROW);
  });

  it('calls the RPC with the business id', async () => {
    const supabase = mockClient({
      get_business_public_info: { data: [INFO_ROW] },
      get_business_rating_summary: { data: [] },
      business_branches: { data: [] },
    });

    await getPublicBusinessProfile(BUSINESS_ID);

    expect(supabase.rpc).toHaveBeenCalledWith('get_business_public_info', {
      p_business_id: BUSINESS_ID,
    });
  });

  it('is null when the shop has no settings row', async () => {
    // The common case: settings only exist once the owner saves the form.
    mockClient({
      get_business_public_info: { data: [] },
      get_business_rating_summary: { data: [] },
      business_branches: { data: [] },
    });

    const result = await getPublicBusinessProfile(BUSINESS_ID);

    if ('error' in result) throw new Error('expected a profile');
    expect(result.business.info).toBeNull();
  });

  it('still renders the profile when the info read fails', async () => {
    // Decorative: an RPC error must not 404 or 500 a healthy shop page.
    mockClient({
      get_business_public_info: { error: { message: 'permission denied' } },
      get_business_rating_summary: { data: [] },
      business_branches: { data: [] },
    });

    const result = await getPublicBusinessProfile(BUSINESS_ID);

    if ('error' in result) throw new Error('expected a profile');
    expect(result.business.shop_name).toBe('Aura Hair Studio');
    expect(result.business.info).toBeNull();
  });

  it('normalizes missing keys to null rather than undefined', async () => {
    mockClient({
      get_business_public_info: {
        data: [{ contact_phone_public: '0333201234' }],
      },
      get_business_rating_summary: { data: [] },
      business_branches: { data: [] },
    });

    const result = await getPublicBusinessProfile(BUSINESS_ID);

    if ('error' in result) throw new Error('expected a profile');
    expect(result.business.info).toEqual({
      operating_hours: null,
      social_links: null,
      contact_website: null,
      contact_phone_public: '0333201234',
    });
  });
});
