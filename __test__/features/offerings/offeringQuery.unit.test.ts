/**
 * getOfferingVocabulary — the server read behind every relabelled surface.
 *
 * The contract worth pinning: it NEVER throws and never returns a partial
 * object. A failed vocabulary read must degrade to retail copy, not 500 a
 * dashboard.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getOfferingVocabulary } from '@/lib/api/offerings/offeringQuery';
import { createServerSupabaseClient } from '@/supabase/server';
import { DEFAULT_OFFERING_VOCABULARY } from '@/lib/utils/offeringVocabulary';

vi.mock('@/supabase/server', () => ({
  createServerSupabaseClient: vi.fn(),
}));

const SALON_PROFILE = {
  services: {
    singular: 'Service',
    plural: 'Services',
    catalogue: 'Service Menu',
  },
  icon: 'Scissors',
};

type MaybeSingleResult = {
  data: Record<string, unknown> | null;
  error: { message: string } | null;
};

function mockRead(result: MaybeSingleResult) {
  const chain = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue(result),
  };
  vi.mocked(createServerSupabaseClient).mockResolvedValue({
    from: vi.fn().mockReturnValue(chain),
  } as unknown as Awaited<ReturnType<typeof createServerSupabaseClient>>);
  return chain;
}

// React.cache memoizes per request; in tests each call must be independent.
beforeEach(() => {
  vi.clearAllMocks();
  vi.resetModules();
});

describe('getOfferingVocabulary', () => {
  it('resolves the profile for the business offering_mode', async () => {
    mockRead({
      data: {
        offering_mode: 'services',
        business_types: { offering_profile: SALON_PROFILE },
      },
      error: null,
    });

    const v = await getOfferingVocabulary('biz-1');

    expect(v.catalogue).toBe('Service Menu');
    expect(v.addLabel).toBe('Add Service');
    expect(v.icon).toBe('Scissors');
  });

  it('normalizes an array-shaped PostgREST embed', async () => {
    // The to-one embed comes back as an array under some join configurations;
    // reading `.offering_profile` off the array would silently yield retail
    // copy for every service business.
    mockRead({
      data: {
        offering_mode: 'services',
        business_types: [{ offering_profile: SALON_PROFILE }],
      },
      error: null,
    });

    expect((await getOfferingVocabulary('biz-1')).catalogue).toBe(
      'Service Menu',
    );
  });

  it('short-circuits to the default without querying when no id is given', async () => {
    const chain = mockRead({ data: null, error: null });

    expect(await getOfferingVocabulary(null)).toEqual(
      DEFAULT_OFFERING_VOCABULARY,
    );
    expect(await getOfferingVocabulary(undefined)).toEqual(
      DEFAULT_OFFERING_VOCABULARY,
    );
    expect(chain.maybeSingle).not.toHaveBeenCalled();
  });

  it('degrades to the default on a DB error rather than throwing', async () => {
    mockRead({ data: null, error: { message: 'connection reset' } });

    await expect(getOfferingVocabulary('biz-1')).resolves.toEqual(
      DEFAULT_OFFERING_VOCABULARY,
    );
  });

  it('degrades to the default when the business row is missing', async () => {
    mockRead({ data: null, error: null });

    await expect(getOfferingVocabulary('biz-missing')).resolves.toEqual(
      DEFAULT_OFFERING_VOCABULARY,
    );
  });

  it('degrades to the default when the client itself throws', async () => {
    vi.mocked(createServerSupabaseClient).mockRejectedValue(
      new Error('no cookies in this context'),
    );

    await expect(getOfferingVocabulary('biz-1')).resolves.toEqual(
      DEFAULT_OFFERING_VOCABULARY,
    );
  });

  it('degrades to the default when the business type has no profile yet', async () => {
    mockRead({
      data: { offering_mode: 'services', business_types: null },
      error: null,
    });

    await expect(getOfferingVocabulary('biz-1')).resolves.toEqual(
      DEFAULT_OFFERING_VOCABULARY,
    );
  });
});
