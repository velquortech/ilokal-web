import { describe, it, expect, beforeEach, vi, Mock } from 'vitest';
import { createServerSupabaseClient } from '@/supabase/server';
import { getBusinessProfileData } from '../businessQuery';
import type { BusinessProfileData } from '@/lib/types';

vi.mock('@/supabase/server', () => ({
  createServerSupabaseClient: vi.fn(),
}));

// ─── chain helpers ───────────────────────────────────────────────────────────

function makeChain(data: unknown, error: unknown = null) {
  const chain: Record<string, ReturnType<typeof vi.fn>> = {};
  for (const m of ['select', 'eq', 'is']) {
    chain[m] = vi.fn().mockReturnValue(chain);
  }
  chain.single = vi.fn().mockResolvedValue({ data, error });
  return chain;
}

function mockClient(chain: ReturnType<typeof makeChain>) {
  const client = {
    from: vi.fn().mockReturnValue(chain),
  } as unknown as Awaited<ReturnType<typeof createServerSupabaseClient>>;
  (createServerSupabaseClient as unknown as Mock).mockResolvedValueOnce(client);
  return client;
}

// ─── fixtures ────────────────────────────────────────────────────────────────

const BUSINESS_ID = 'biz-00000000-0000-0000-0000-000000000001';

const mockData: BusinessProfileData = {
  id: BUSINESS_ID,
  shop_name: 'Test Cafe',
  description: 'A cozy place',
  logo_url: 'https://example.com/logo.png',
  banner_url: null,
  category_id: '550e8400-e29b-41d4-a716-446655440000',
  interior_images: ['https://example.com/img1.jpg'],
  status: 'verified',
  updated_at: new Date().toISOString(),
};

// ─── tests ───────────────────────────────────────────────────────────────────

describe('getBusinessProfileData', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns BusinessProfileData when business is found', async () => {
    const chain = makeChain(mockData);
    mockClient(chain);
    const result = await getBusinessProfileData(BUSINESS_ID);
    expect(result).not.toBeNull();
    expect(result?.shop_name).toBe('Test Cafe');
    expect(result?.status).toBe('verified');
    expect(result?.category_id).toBe('550e8400-e29b-41d4-a716-446655440000');
  });

  it('returns null when business is not found', async () => {
    const chain = makeChain(null, { message: 'Row not found' });
    mockClient(chain);
    const result = await getBusinessProfileData(BUSINESS_ID);
    expect(result).toBeNull();
  });

  it('returns null when data is null with no error', async () => {
    const chain = makeChain(null);
    mockClient(chain);
    const result = await getBusinessProfileData(BUSINESS_ID);
    expect(result).toBeNull();
  });

  it('returns null when createServerSupabaseClient throws', async () => {
    (createServerSupabaseClient as unknown as Mock).mockRejectedValueOnce(
      new Error('connection failed'),
    );
    const result = await getBusinessProfileData(BUSINESS_ID);
    expect(result).toBeNull();
  });

  it('queries the businesses table', async () => {
    const chain = makeChain(mockData);
    const client = mockClient(chain);
    await getBusinessProfileData(BUSINESS_ID);
    expect(client.from).toHaveBeenCalledWith('businesses');
  });

  it('filters by businessId', async () => {
    const chain = makeChain(mockData);
    mockClient(chain);
    await getBusinessProfileData(BUSINESS_ID);
    expect(chain.eq).toHaveBeenCalledWith('id', BUSINESS_ID);
  });

  it('filters out archived businesses', async () => {
    const chain = makeChain(mockData);
    mockClient(chain);
    await getBusinessProfileData(BUSINESS_ID);
    expect(chain.is).toHaveBeenCalledWith('archived_at', null);
  });

  it('selects only the profile-relevant columns', async () => {
    const chain = makeChain(mockData);
    mockClient(chain);
    await getBusinessProfileData(BUSINESS_ID);
    const selectArg: string = chain.select.mock.calls[0][0];
    expect(selectArg).toContain('shop_name');
    expect(selectArg).toContain('status');
    expect(selectArg).toContain('category_id');
    expect(selectArg).toContain('banner_url');
  });
});
