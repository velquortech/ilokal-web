import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { TestNextRequest } from '@/lib/types';

/**
 * The route's guards.
 *
 * The plan for this feature claimed a test asserting the route refuses a
 * non-admin and there wasn't one — the only suites covered pure helpers and the
 * composer. These are the assertions that claim was describing, plus the two
 * the PR review turned up: an admin-derived image must not advertise itself as
 * shared-cacheable, and an owner-controlled `logo_url` must never reach a
 * server-side fetch.
 */

const NEXT_OG_HEADERS = new Map<string, unknown>();
/** What the template was actually handed — not merely what was called. */
const RENDERED = new Map<
  string,
  { cards: Array<{ logoUrl: string | null }> }
>();

vi.mock('next/og', () => ({
  ImageResponse: class {
    constructor(
      element: { props: { cards: Array<{ logoUrl: string | null }> } },
      options: Record<string, unknown>,
    ) {
      NEXT_OG_HEADERS.set('last', options.headers);
      RENDERED.set('last', { cards: element.props.cards });
      Object.assign(this, { options });
    }
    async arrayBuffer() {
      return new ArrayBuffer(8);
    }
  },
}));

const assertAuthorized = vi.fn();
vi.mock('@/lib/utils/auth', () => ({
  assertAuthorized: (...args: unknown[]) => assertAuthorized(...args),
}));

// Rest-arg implementations: the mock is re-invoked with `(...args)` by the
// factory below, so a zero-arg signature would make both the spread and
// `mock.calls[i][j]` unreadable to TS.
const rateLimit = vi.fn((..._args: unknown[]) => ({
  allowed: true,
  remaining: 59,
  retryAfterSec: 0,
}));
vi.mock('@/app/api/helpers/rateLimit', () => ({
  rateLimit: (...args: unknown[]) => rateLimit(...args),
}));

const fetchImageAsDataUrl = vi.fn(async (..._args: unknown[]) => null);
vi.mock('@/lib/og/remoteImage', () => ({
  fetchImageAsDataUrl: (...args: unknown[]) => fetchImageAsDataUrl(...args),
  loadWordmarkDataUrl: async () => 'data:image/png;base64,AAAA',
}));

vi.mock('@/lib/og/fonts', () => ({ loadPostFonts: async () => [] }));

const rows: Array<{ id: string; shop_name: string; logo_url: string | null }> =
  [];
let queryError: unknown = null;

vi.mock('@/supabase/server', () => ({
  createServerSupabaseClient: async () => ({
    from: () => ({
      select: () => ({
        in: () => ({
          is: async () => ({ data: rows, error: queryError }),
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

const ID = '11111111-1111-1111-1111-111111111111';

function request(query: string): TestNextRequest {
  const url = new URL(`http://localhost/api/admin/welcome-post?${query}`);
  return { nextUrl: url, url: url.toString() } as unknown as TestNextRequest;
}

async function GET(query: string) {
  const mod = await import('@/app/api/admin/welcome-post/route');
  return mod.GET(request(query) as never);
}

beforeEach(() => {
  vi.clearAllMocks();
  NEXT_OG_HEADERS.clear();
  RENDERED.clear();
  rows.length = 0;
  rows.push({ id: ID, shop_name: 'Test Shop', logo_url: 'a/logo.webp' });
  queryError = null;
  rateLimit.mockReturnValue({ allowed: true, remaining: 59, retryAfterSec: 0 });
  assertAuthorized.mockResolvedValue({
    authorized: true,
    user: { id: 'admin-1' },
    profile: { role: 'admin' },
  });
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

describe('who may render a post', () => {
  it('refuses a non-admin with the helper’s own response', async () => {
    // The helper already returns the right status and the ApiResponse
    // envelope for each of unauthenticated / non-admin / inactive. Rebuilding
    // a flat 401 here collapsed all four into one wrong answer.
    const refusal = new Response('nope', { status: 403 });
    assertAuthorized.mockResolvedValue({ authorized: false, error: refusal });

    const response = await GET(`ids=${ID}`);
    expect(response).toBe(refusal);
  });

  it('asks for the admin role explicitly', async () => {
    await GET(`ids=${ID}`);
    expect(assertAuthorized.mock.calls[0][1]).toEqual({ roles: ['admin'] });
  });

  it('never touches the database when the caller is refused', async () => {
    assertAuthorized.mockResolvedValue({
      authorized: false,
      error: new Response(null, { status: 401 }),
    });
    await GET(`ids=${ID}`);
    expect(fetchImageAsDataUrl).not.toHaveBeenCalled();
  });
});

describe('rate limiting', () => {
  it('is keyed by the admin, after the auth check', async () => {
    await GET(`ids=${ID}`);
    expect(rateLimit.mock.calls[0][0]).toBe('welcome-post:admin-1');
  });

  it('answers 429 with Retry-After and renders nothing', async () => {
    rateLimit.mockReturnValue({
      allowed: false,
      remaining: 0,
      retryAfterSec: 42,
    });
    const response = await GET(`ids=${ID}`);
    expect(response.status).toBe(429);
    expect(response.headers.get('Retry-After')).toBe('42');
    expect(fetchImageAsDataUrl).not.toHaveBeenCalled();
  });
});

describe('the response must not sit in a shared cache', () => {
  it('overrides ImageResponse’s public, immutable default', async () => {
    // `ImageResponse` defaults to `public, immutable, no-transform,
    // max-age=31536000` — right for a public OG card, and exactly wrong for a
    // response derived from an admin's cookie session. Asserted on the
    // response actually returned rather than on the options handed to the
    // renderer, since the route now buffers the render and serves its own.
    const response = await GET(`ids=${ID}`);
    const cache = response.headers.get('cache-control') ?? '';
    expect(cache).toContain('private');
    expect(cache).toContain('no-store');
    expect(cache).not.toContain('public');
    expect(response.headers.get('content-type')).toBe('image/png');
  });

  it('carries the same header on the download', async () => {
    const response = await GET(`ids=${ID}&download=1`);
    expect(response.headers.get('cache-control')).toContain('no-store');
    expect(response.headers.get('content-disposition')).toContain('attachment');
  });
});

describe('logos are fetched through the guard, never by the renderer', () => {
  it('routes every logo through fetchImageAsDataUrl', async () => {
    await GET(`ids=${ID}`);
    expect(fetchImageAsDataUrl).toHaveBeenCalledWith(
      'https://storage.test/a/logo.webp',
    );
  });

  it('renders the GUARD’s answer, not the raw URL', async () => {
    // Calling the guard and then rendering the original value would satisfy a
    // weaker assertion while leaving the SSRF wide open — the whole point is
    // that nothing reaches Satori except what came back from the guard.
    fetchImageAsDataUrl.mockResolvedValue(
      'data:image/png;base64,SAFE' as never,
    );
    await GET(`ids=${ID}`);

    const cards = RENDERED.get('last')!.cards;
    expect(cards[0].logoUrl).toBe('data:image/png;base64,SAFE');
    expect(cards[0].logoUrl).not.toContain('storage.test');
  });

  it('hands the card a null rather than a URL the guard refused', async () => {
    fetchImageAsDataUrl.mockResolvedValue(null);
    await GET(`ids=${ID}`);
    expect(RENDERED.get('last')!.cards[0].logoUrl).toBeNull();
  });

  it('forces the render inside the handler, so a failure is a real 500', async () => {
    // Returning the ImageResponse directly streams it, and Satori renders
    // lazily as that stream is consumed — after the handler returned. A throw
    // there killed the function: FUNCTION_INVOCATION_FAILED, no log, nothing
    // to debug. Buffering is what makes a render failure catchable.
    const { ImageResponse } = await import('next/og');
    const spy = vi
      .spyOn(
        ImageResponse.prototype as unknown as { arrayBuffer: () => unknown },
        'arrayBuffer',
      )
      .mockRejectedValue(new Error('u2 is not iterable'));

    const response = await GET(`ids=${ID}`);
    expect(response.status).toBe(500);
    expect(JSON.stringify(await response.json())).not.toContain('u2');
    spy.mockRestore();
  });

  it('renders anyway when the guard refuses the logo', async () => {
    // A refused or unreachable logo costs one card its picture. It must never
    // cost the post — and a throw inside the render would escape the handler's
    // try/catch, because ImageResponse renders lazily while streaming.
    fetchImageAsDataUrl.mockResolvedValue(null);
    const response = await GET(`ids=${ID}`);
    expect(response.status).not.toBe(500);
  });
});

describe('the query', () => {
  it.each([
    ['no ids', ''],
    ['a malformed id', 'ids=not-a-uuid'],
    [
      'three ids',
      `ids=${ID},22222222-2222-2222-2222-222222222222,33333333-3333-3333-3333-333333333333`,
    ],
  ])('rejects %s with a 400', async (_label, query) => {
    const response = await GET(query);
    expect(response.status).toBe(400);
  });

  it('dedupes, so ?ids=x,x is one card rather than two of the same shop', async () => {
    const response = await GET(`ids=${ID},${ID}`);
    expect(response.status).not.toBe(400);
    expect(fetchImageAsDataUrl).toHaveBeenCalledTimes(1);
  });

  it('404s when no such shop is live', async () => {
    rows.length = 0;
    const response = await GET(`ids=${ID}`);
    expect(response.status).toBe(404);
  });

  it('leaks no driver text when the read fails', async () => {
    queryError = { message: 'relation "businesses" does not exist' };
    const response = await GET(`ids=${ID}`);
    expect(response.status).toBe(500);
    expect(JSON.stringify(await response.json())).not.toContain('relation');
  });
});
