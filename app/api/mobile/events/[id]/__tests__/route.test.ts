/**
 * GET /api/mobile/events/:id
 *
 * One approved, unarchived event with resolved refs. Claims under test: the
 * kill switch returns 404, malformed ids are rejected, non-approved/archived
 * rows 404, and image URLs + to-one embeds are resolved for mobile rendering.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@/supabase/bearer', () => ({ createBearerClient: vi.fn() }));
vi.mock('@/lib/api/appSettings', () => ({ getEventsEnabled: vi.fn() }));
vi.mock('@/app/api/helpers/storage', () => ({
  resolveStorageUrl: vi.fn(
    (_client: unknown, bucket: string, path: string | null) =>
      path ? `https://cdn.example/${bucket}/${path}` : null,
  ),
}));

import { createBearerClient } from '@/supabase/bearer';
import { getEventsEnabled } from '@/lib/api/appSettings';
import { GET } from '../route';

function mockMaybeSingle(result: {
  data: Record<string, unknown> | null;
  error: { message: string } | null;
}) {
  const query = {
    eq: vi.fn(() => query),
    is: vi.fn(() => query),
    maybeSingle: vi.fn(async () => result),
  };
  const select = vi.fn(() => query);
  vi.mocked(createBearerClient).mockReturnValue({
    from: vi.fn(() => ({ select })),
  } as unknown as ReturnType<typeof createBearerClient>);
  return { select, query };
}

const EVENT_ID = 'a51e2eeb-b865-412e-ad7d-65e9f0335dd9';
const UNKNOWN_ID = '00000000-0000-0000-0000-000000000000';

function request(id: string): NextRequest {
  return new NextRequest(`http://localhost/api/mobile/events/${id}`);
}

beforeEach(() => {
  vi.mocked(getEventsEnabled).mockResolvedValue(true);
});

describe('GET /api/mobile/events/:id', () => {
  it('returns 404 when the feature flag is off', async () => {
    vi.mocked(getEventsEnabled).mockResolvedValue(false);
    const res = await GET(request(EVENT_ID), {
      params: Promise.resolve({ id: EVENT_ID }),
    });
    expect(res.status).toBe(404);
  });

  it('rejects a malformed id', async () => {
    const res = await GET(request('../../etc'), {
      params: Promise.resolve({ id: '../../etc' }),
    });
    expect(res.status).toBe(400);
  });

  it('resolves the event with its refs', async () => {
    mockMaybeSingle({
      data: {
        id: EVENT_ID,
        name: 'Dinagyang Nights',
        address: 'Iloilo River Esplanade',
        image_url: 'raw/banner.jpg',
        status: 'approved',
        business: [
          { id: 'biz-1', shop_name: 'Roastery', logo_url: 'raw/logo.jpg' },
        ],
        product: null,
      },
      error: null,
    });

    const res = await GET(request(EVENT_ID), {
      params: Promise.resolve({ id: EVENT_ID }),
    });
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.event.image_url).toBe(
      'https://cdn.example/event-images/raw/banner.jpg',
    );
    expect(body.event.business.shop_name).toBe('Roastery');
    expect(body.event.business.logo_url).toBe(
      'https://cdn.example/shop-logos/raw/logo.jpg',
    );
  });

  it('returns 404 for an unknown id', async () => {
    mockMaybeSingle({ data: null, error: null });
    const res = await GET(request(UNKNOWN_ID), {
      params: Promise.resolve({ id: UNKNOWN_ID }),
    });
    expect(res.status).toBe(404);
  });

  it('returns a generic 500 on a DB error', async () => {
    mockMaybeSingle({ data: null, error: { message: 'boom' } });
    const res = await GET(request(EVENT_ID), {
      params: Promise.resolve({ id: EVENT_ID }),
    });
    expect(res.status).toBe(500);
  });
});
