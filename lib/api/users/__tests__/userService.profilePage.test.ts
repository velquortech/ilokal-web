import { describe, it, expect, beforeEach, vi, Mock } from 'vitest';
import { createServerSupabaseClient } from '@/supabase/server';
import { fetchProfileForPage, type ProfilePageData } from '../userService';

vi.mock('@/supabase/server', () => ({
  createServerSupabaseClient: vi.fn(),
}));

// ─── chain helpers ───────────────────────────────────────────────────────────

function makeChain(data: unknown, error: unknown = null) {
  const chain: Record<string, ReturnType<typeof vi.fn>> = {};
  for (const m of ['select', 'eq']) {
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

const USER_ID = 'user-00000000-0000-0000-0000-000000000001';

const mockProfileRow = {
  id: USER_ID,
  email: 'owner@example.com',
  full_name: 'Jane Owner',
  phone_number: '+63 912 345 6789',
  role: 'business_owner',
  avatar_url: 'https://example.com/avatar.png',
  status: 'active',
  archived_at: null,
};

// ─── tests ───────────────────────────────────────────────────────────────────

describe('fetchProfileForPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns ProfilePageData including the status field', async () => {
    const chain = makeChain(mockProfileRow);
    mockClient(chain);
    const result: ProfilePageData = await fetchProfileForPage(USER_ID);
    expect(result.id).toBe(USER_ID);
    expect(result.email).toBe('owner@example.com');
    expect(result.full_name).toBe('Jane Owner');
    expect(result.status).toBe('active');
  });

  it('includes role in the returned data', async () => {
    const chain = makeChain(mockProfileRow);
    mockClient(chain);
    const result = await fetchProfileForPage(USER_ID);
    expect(result.role).toBe('business_owner');
  });

  it('includes avatar_url in the returned data', async () => {
    const chain = makeChain(mockProfileRow);
    mockClient(chain);
    const result = await fetchProfileForPage(USER_ID);
    expect(result.avatar_url).toBe('https://example.com/avatar.png');
  });

  it('defaults status to "active" when DB returns null status', async () => {
    const chain = makeChain({ ...mockProfileRow, status: null });
    mockClient(chain);
    const result = await fetchProfileForPage(USER_ID);
    expect(result.status).toBe('active');
  });

  it('handles suspended status correctly', async () => {
    const chain = makeChain({ ...mockProfileRow, status: 'suspended' });
    mockClient(chain);
    const result = await fetchProfileForPage(USER_ID);
    expect(result.status).toBe('suspended');
  });

  it('throws when profile is not found', async () => {
    const chain = makeChain(null, { message: 'Row not found' });
    mockClient(chain);
    await expect(fetchProfileForPage(USER_ID)).rejects.toThrow(
      /Failed to fetch profile/,
    );
  });

  it('throws when data is null with no error', async () => {
    const chain = makeChain(null);
    mockClient(chain);
    await expect(fetchProfileForPage(USER_ID)).rejects.toThrow(
      /Failed to fetch profile/,
    );
  });

  it('queries the profiles table', async () => {
    const chain = makeChain(mockProfileRow);
    const client = mockClient(chain);
    await fetchProfileForPage(USER_ID);
    expect(client.from).toHaveBeenCalledWith('profiles');
  });

  it('filters by userId', async () => {
    const chain = makeChain(mockProfileRow);
    mockClient(chain);
    await fetchProfileForPage(USER_ID);
    expect(chain.eq).toHaveBeenCalledWith('id', USER_ID);
  });
});
