import { describe, it, expect, vi, beforeEach, Mock } from 'vitest';
import { verifyBusinessOwner } from '@/lib/api/verifyBusinessOwner';
import { createServerSupabaseClient } from '@/supabase/server';
import { revalidatePath } from 'next/cache';
import type { BusinessProfileData } from '@/lib/types';

vi.mock('@/lib/api/verifyBusinessOwner');
vi.mock('@/supabase/server', () => ({ createServerSupabaseClient: vi.fn() }));
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));
vi.mock('@/config/routeConfig', () => ({
  businessProfilePath: (id: string) => `/business/${id}/profile`,
}));

import { updateBusinessProfileAction } from '../profileActions';

// ─── fixtures ───────────────────────────────────────────────────────────────

const BUSINESS_ID = 'biz-00000000-0000-0000-0000-000000000001';
const VALID_UUID = '550e8400-e29b-41d4-a716-446655440000';

const authorized = {
  authorized: true as const,
  business: { id: BUSINESS_ID },
  user: { id: 'user-1' },
};
const unauthorized = {
  authorized: false as const,
  error: { code: 'UNAUTHORIZED', message: 'Not authorized' },
};

const validInput = { shop_name: 'My Cafe' };

const mockBusinessProfile: BusinessProfileData = {
  id: BUSINESS_ID,
  shop_name: 'My Cafe',
  description: null,
  logo_url: null,
  banner_url: null,
  category_id: null,
  interior_images: null,
  status: 'verified',
  updated_at: new Date().toISOString(),
};

// ─── supabase chain mock ─────────────────────────────────────────────────────

function makeUpdateChain(data: unknown, error: unknown = null) {
  const chain: Record<string, ReturnType<typeof vi.fn>> = {};
  for (const m of ['update', 'eq', 'select']) {
    chain[m] = vi.fn().mockReturnValue(chain);
  }
  chain.single = vi.fn().mockResolvedValue({ data, error });
  return chain;
}

function mockSupabaseClient(chain: ReturnType<typeof makeUpdateChain>) {
  const client = {
    from: vi.fn().mockReturnValue(chain),
  } as unknown as Awaited<ReturnType<typeof createServerSupabaseClient>>;
  (createServerSupabaseClient as unknown as Mock).mockResolvedValueOnce(client);
  return client;
}

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

// ─── tests ───────────────────────────────────────────────────────────────────

describe('updateBusinessProfileAction', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ── authorization ──

  it('returns error when not authorized', async () => {
    mockUnauthorized();
    const res = await updateBusinessProfileAction(BUSINESS_ID, validInput);
    expect(res.success).toBe(false);
    expect(res.error?.code).toBe('UNAUTHORIZED');
  });

  it('does not call supabase when not authorized', async () => {
    mockUnauthorized();
    await updateBusinessProfileAction(BUSINESS_ID, validInput);
    expect(createServerSupabaseClient).not.toHaveBeenCalled();
  });

  // ── validation ──

  it('returns VALIDATION_ERROR for shop_name shorter than 2 chars', async () => {
    mockAuthorized();
    const res = await updateBusinessProfileAction(BUSINESS_ID, {
      shop_name: 'A',
    });
    expect(res.success).toBe(false);
    expect(res.error?.code).toBe('VALIDATION_ERROR');
  });

  it('returns VALIDATION_ERROR for invalid logo_url', async () => {
    mockAuthorized();
    const res = await updateBusinessProfileAction(BUSINESS_ID, {
      shop_name: 'My Cafe',
      logo_url: 'not-a-url',
    });
    expect(res.success).toBe(false);
    expect(res.error?.code).toBe('VALIDATION_ERROR');
  });

  it('does not call supabase on validation failure', async () => {
    mockAuthorized();
    await updateBusinessProfileAction(BUSINESS_ID, { shop_name: 'A' });
    expect(createServerSupabaseClient).not.toHaveBeenCalled();
  });

  // ── database error ──

  it('returns DB_ERROR when supabase update fails', async () => {
    mockAuthorized();
    const chain = makeUpdateChain(null, { message: 'connection refused' });
    mockSupabaseClient(chain);
    const res = await updateBusinessProfileAction(BUSINESS_ID, validInput);
    expect(res.success).toBe(false);
    expect(res.error?.code).toBe('DB_ERROR');
  });

  it('returns DB_ERROR when supabase returns null data', async () => {
    mockAuthorized();
    const chain = makeUpdateChain(null);
    mockSupabaseClient(chain);
    const res = await updateBusinessProfileAction(BUSINESS_ID, validInput);
    expect(res.success).toBe(false);
    expect(res.error?.code).toBe('DB_ERROR');
  });

  // ── happy path ──

  it('returns success with updated business profile', async () => {
    mockAuthorized();
    const chain = makeUpdateChain(mockBusinessProfile);
    mockSupabaseClient(chain);
    const res = await updateBusinessProfileAction(BUSINESS_ID, validInput);
    expect(res.success).toBe(true);
    expect(res.data?.shop_name).toBe('My Cafe');
    expect(res.data?.id).toBe(BUSINESS_ID);
  });

  it('calls revalidatePath with the profile path on success', async () => {
    mockAuthorized();
    const chain = makeUpdateChain(mockBusinessProfile);
    mockSupabaseClient(chain);
    await updateBusinessProfileAction(BUSINESS_ID, validInput);
    expect(revalidatePath).toHaveBeenCalledWith(
      `/business/${BUSINESS_ID}/profile`,
    );
  });

  it('updates from the correct businesses table', async () => {
    mockAuthorized();
    const chain = makeUpdateChain(mockBusinessProfile);
    const client = mockSupabaseClient(chain);
    await updateBusinessProfileAction(BUSINESS_ID, validInput);
    expect(client.from).toHaveBeenCalledWith('businesses');
  });

  it('filters update by businessId', async () => {
    mockAuthorized();
    const chain = makeUpdateChain(mockBusinessProfile);
    mockSupabaseClient(chain);
    await updateBusinessProfileAction(BUSINESS_ID, validInput);
    expect(chain.eq).toHaveBeenCalledWith('id', BUSINESS_ID);
  });

  it('passes all provided fields to the update call', async () => {
    mockAuthorized();
    const chain = makeUpdateChain(mockBusinessProfile);
    mockSupabaseClient(chain);
    await updateBusinessProfileAction(BUSINESS_ID, {
      shop_name: 'New Name',
      description: 'A great place',
      category_id: VALID_UUID,
    });
    const updateCall = chain.update.mock.calls[0][0];
    expect(updateCall.shop_name).toBe('New Name');
    expect(updateCall.description).toBe('A great place');
    expect(updateCall.category_id).toBe(VALID_UUID);
  });

  // ── internal error ──

  it('returns INTERNAL_ERROR when an unexpected exception is thrown', async () => {
    mockAuthorized();
    (createServerSupabaseClient as unknown as Mock).mockRejectedValueOnce(
      new Error('unexpected'),
    );
    const res = await updateBusinessProfileAction(BUSINESS_ID, validInput);
    expect(res.success).toBe(false);
    expect(res.error?.code).toBe('INTERNAL_ERROR');
  });
});
