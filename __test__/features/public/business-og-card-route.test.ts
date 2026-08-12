import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { TestNextRequest } from '@/lib/types';

/**
 * The OG card route's guards and output — behavioral, mirroring the
 * welcome-post route suite. The contract test pins the pages that point at
 * this route; this suite proves the route itself serves what they advertise:
 * a PNG of the branded card, revalidating rather than immutable, for verified
 * businesses only.
 */

const NEXT_OG = new Map<string, unknown>();
/** What the template was actually handed — not merely what was called. */
vi.mock('next/og', () => ({
  ImageResponse: class {
    constructor(
      element: { props: Record<string, unknown> },
      options: Record<string, unknown>,
    ) {
      NEXT_OG.set('last', { props: element.props, options });
      Object.assign(this, { options });
    }
    async arrayBuffer() {
      return new ArrayBuffer(8);
    }
  },
}));

const fetchImageAsDataUrl = vi.fn(
  async (..._args: unknown[]): Promise<string | null> =>
    'data:image/png;base64,LOGO',
);
vi.mock('@/lib/og/remoteImage', () => ({
  fetchImageAsDataUrl: (...args: unknown[]) => fetchImageAsDataUrl(...args),
  loadWordmarkDataUrl: async () => 'data:image/png;base64,AAAA',
}));

vi.mock('@/lib/og/fonts', () => ({ loadPostFonts: async () => [] }));

let row: { id: string; shop_name: string; logo_url: string | null } | null =
  null;
let queryError: unknown = null;

vi.mock('@/supabase/server', () => ({
  createServerSupabaseClient: async () => ({
    from: () => ({
      select: () => ({
        eq: () => ({
          eq: () => ({
            is: () => ({
              single: async () => ({ data: row, error: queryError }),
            }),
          }),
        }),
      }),
    }),
    storage: {
      from: () => ({
        getPublicUrl: (p: string) => ({
          data: { publicUrl: `https://storage.test/${p}` },
        }),
      }),
    },
  }),
}));

const ID = '11111111-1111-1111-1111-111111111101';

function request(id: string): TestNextRequest {
  const url = new URL(`http://localhost/api/og/business/${id}`);
  return { nextUrl: url, url: url.toString() } as unknown as TestNextRequest;
}

async function GET(id: string) {
  const mod = await import('@/app/api/og/business/[businessId]/route');
  // `as never`: the route's NextRequest is a superset of the test's minimal
  // stand-in (the same cast the welcome-post route suite uses).
  return mod.GET(request(id) as never, {
    params: Promise.resolve({ businessId: id }),
  }) as Promise<Response>;
}

beforeEach(() => {
  vi.clearAllMocks();
  NEXT_OG.clear();
  row = { id: ID, shop_name: 'The Artisan Roastery', logo_url: 'a/logo.webp' };
  queryError = null;
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

describe('who may be rendered', () => {
  it('rejects a non-guid id before touching the database', async () => {
    const response = await GET('not-a-guid');
    expect(response.status).toBe(400);
    expect(fetchImageAsDataUrl).not.toHaveBeenCalled();
  });

  it('404s when the business is not verified or not found', async () => {
    row = null;
    const response = await GET(ID);
    expect(response.status).toBe(404);
    expect(fetchImageAsDataUrl).not.toHaveBeenCalled();
  });
});

describe('what is served', () => {
  it('hands the card the shop name and its resolved logo', async () => {
    const response = await GET(ID);
    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toBe('image/png');

    const { props } = NEXT_OG.get('last') as {
      props: { name: string; logoUrl: string | null };
    };
    expect(props.name).toBe('The Artisan Roastery');
    expect(props.logoUrl).toBe('data:image/png;base64,LOGO');
    // Fetched from the RESOLVED storage URL, not the raw stored path.
    expect(fetchImageAsDataUrl).toHaveBeenCalledWith(
      'https://storage.test/a/logo.webp',
    );
  });

  it('caches revalidating, not immutable — a changed logo must show up', async () => {
    const response = await GET(ID);
    const cache = response.headers.get('cache-control') ?? '';
    expect(cache).toContain('public');
    expect(cache).toContain('max-age=300');
    expect(cache).toContain('s-maxage=300');
    expect(cache).not.toContain('immutable');
  });

  it('still renders when the logo cannot be fetched — initials card', async () => {
    fetchImageAsDataUrl.mockResolvedValueOnce(null);
    const response = await GET(ID);
    expect(response.status).toBe(200);

    const { props } = NEXT_OG.get('last') as {
      props: { logoUrl: string | null };
    };
    expect(props.logoUrl).toBeNull();
  });
});
