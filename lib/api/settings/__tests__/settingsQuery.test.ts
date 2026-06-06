import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';
import { createServerSupabaseClient } from '@/supabase/server';
import type { BusinessSettings, NotificationPreferences } from '@/lib/types';

vi.mock('@/supabase/server', () => ({ createServerSupabaseClient: vi.fn() }));

import {
  getBusinessSettings,
  upsertBusinessSettings,
  getNotificationPreferences,
  upsertNotificationPreferences,
} from '../settingsQuery';

const BID = 'biz-00000000-0000-0000-0000-000000000001';
const UID = 'user-0000-0000-0000-000000000001';

const mockSettings: BusinessSettings = {
  business_id: BID,
  operating_hours: null,
  social_links: null,
  contact_website: null,
  contact_phone_public: null,
  allow_reviews: true,
  coupon_default_expiry_days: 30,
};

const mockPrefs: NotificationPreferences = {
  user_id: UID,
  email: true,
  push: false,
  digest: 'daily',
};

function makeChain(result: { data: unknown; error: unknown }) {
  const chain: Record<string, ReturnType<typeof vi.fn>> = {};
  for (const m of ['from', 'select', 'eq', 'upsert', 'single']) {
    chain[m] = vi.fn().mockReturnValue(chain);
  }
  chain.single = vi.fn().mockResolvedValue(result);
  return chain;
}

function mockClient(chain: ReturnType<typeof makeChain>) {
  (createServerSupabaseClient as unknown as Mock).mockResolvedValueOnce({
    from: vi.fn().mockReturnValue(chain),
  });
}

beforeEach(() => vi.clearAllMocks());

// ── getBusinessSettings ───────────────────────────────────────────────────────

describe('getBusinessSettings', () => {
  it('returns null when no row exists', async () => {
    mockClient(makeChain({ data: null, error: { message: 'Not found' } }));
    const result = await getBusinessSettings(BID);
    expect(result).toBeNull();
  });

  it('returns mapped settings when row exists', async () => {
    mockClient(makeChain({ data: mockSettings, error: null }));
    const result = await getBusinessSettings(BID);
    expect(result).toEqual(mockSettings);
  });
});

// ── upsertBusinessSettings ────────────────────────────────────────────────────

describe('upsertBusinessSettings', () => {
  it('returns data on success', async () => {
    const chain = makeChain({ data: mockSettings, error: null });
    (createServerSupabaseClient as unknown as Mock).mockResolvedValueOnce({
      from: vi.fn().mockReturnValue(chain),
    });
    const result = await upsertBusinessSettings(BID, { allow_reviews: true });
    expect(result).toEqual(mockSettings);
  });

  it('throws when DB returns an error', async () => {
    const chain = makeChain({ data: null, error: { message: 'DB error' } });
    (createServerSupabaseClient as unknown as Mock).mockResolvedValueOnce({
      from: vi.fn().mockReturnValue(chain),
    });
    await expect(upsertBusinessSettings(BID, {})).rejects.toThrow('DB error');
  });
});

// ── getNotificationPreferences ────────────────────────────────────────────────

describe('getNotificationPreferences', () => {
  it('returns null when no row exists', async () => {
    mockClient(makeChain({ data: null, error: { message: 'Not found' } }));
    const result = await getNotificationPreferences(UID);
    expect(result).toBeNull();
  });

  it('returns prefs when row exists', async () => {
    mockClient(makeChain({ data: mockPrefs, error: null }));
    const result = await getNotificationPreferences(UID);
    expect(result).toEqual(mockPrefs);
  });
});

// ── upsertNotificationPreferences ─────────────────────────────────────────────

describe('upsertNotificationPreferences', () => {
  it('returns saved data on success', async () => {
    const chain = makeChain({ data: mockPrefs, error: null });
    (createServerSupabaseClient as unknown as Mock).mockResolvedValueOnce({
      from: vi.fn().mockReturnValue(chain),
    });
    const result = await upsertNotificationPreferences(UID, {
      email: true,
      push: false,
      digest: 'daily',
    });
    expect(result).toEqual(mockPrefs);
  });

  it('throws when DB returns an error', async () => {
    const chain = makeChain({
      data: null,
      error: { message: 'Constraint violation' },
    });
    (createServerSupabaseClient as unknown as Mock).mockResolvedValueOnce({
      from: vi.fn().mockReturnValue(chain),
    });
    await expect(
      upsertNotificationPreferences(UID, {
        email: false,
        push: false,
        digest: 'weekly',
      }),
    ).rejects.toThrow('Constraint violation');
  });
});
