import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

/**
 * The image-fetch guard.
 *
 * `businesses.logo_url` is owner-writable free text — the `FOR ALL` owner
 * policy has no column guard — and `resolveStorageUrl` hands back any
 * `http(s)://` value untouched. So this module is what stands between a
 * registrant's chosen URL and a request our server makes on their behalf.
 * Every case below is that boundary.
 */

const STORAGE = 'https://abcdefgh.supabase.co';

async function load() {
  vi.resetModules();
  process.env.NEXT_PUBLIC_SUPABASE_URL = STORAGE;
  process.env.NEXT_IMAGE_PUBLIC_URL = STORAGE;
  return import('../remoteImage');
}

const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47]);

function imageResponse(
  body: Buffer = PNG,
  type = 'image/png',
  init: { status?: number; length?: string } = {},
) {
  const headers = new Headers({ 'content-type': type });
  if (init.length) headers.set('content-length', init.length);
  return {
    ok: (init.status ?? 200) < 400,
    status: init.status ?? 200,
    headers,
    arrayBuffer: async () =>
      body.buffer.slice(body.byteOffset, body.byteOffset + body.byteLength),
  } as unknown as Response;
}

let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  fetchMock = vi.fn();
  vi.stubGlobal('fetch', fetchMock);
  vi.spyOn(console, 'warn').mockImplementation(() => {});
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('the origin allowlist', () => {
  it('accepts the configured storage origin', async () => {
    const { isAllowedImageUrl } = await load();
    expect(isAllowedImageUrl(`${STORAGE}/storage/v1/object/a/logo.webp`)).toBe(
      true,
    );
  });

  it.each([
    ['a foreign host', 'https://evil.example/logo.png'],
    [
      'the storage host in a query string',
      `https://evil.example/?u=${STORAGE}`,
    ],
    ['a credential prefix', 'https://abcdefgh.supabase.co@evil.example/x.png'],
    ['a scheme downgrade', 'http://abcdefgh.supabase.co/logo.png'],
    ['a subdomain of the host', 'https://x.abcdefgh.supabase.co/logo.png'],
    ['a look-alike host', 'https://abcdefgh.supabase.co.evil.example/x.png'],
    ['file', 'file:///etc/passwd'],
    ['the metadata service', 'http://169.254.169.254/latest/meta-data/'],
    ['localhost', 'http://127.0.0.1:54321/storage/v1/object/a.png'],
    ['a data url', 'data:image/png;base64,AAAA'],
    ['nonsense', 'not-a-url'],
  ])('refuses %s', async (_label, url) => {
    const { isAllowedImageUrl } = await load();
    expect(isAllowedImageUrl(url)).toBe(false);
  });

  it('refuses null and empty', async () => {
    const { isAllowedImageUrl } = await load();
    expect(isAllowedImageUrl(null)).toBe(false);
    expect(isAllowedImageUrl(undefined)).toBe(false);
    expect(isAllowedImageUrl('')).toBe(false);
  });

  it('refuses everything when nothing is configured', async () => {
    // A missing env var must narrow the allowlist, never open it.
    vi.resetModules();
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.NEXT_IMAGE_PUBLIC_URL;
    const { isAllowedImageUrl } = await import('../remoteImage');
    expect(isAllowedImageUrl(`${STORAGE}/logo.png`)).toBe(false);
  });
});

describe('fetchImageAsDataUrl', () => {
  it('never fetches a disallowed origin', async () => {
    const { fetchImageAsDataUrl } = await load();
    expect(await fetchImageAsDataUrl('https://evil.example/x.png')).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('returns a data url for an allowed image', async () => {
    const { fetchImageAsDataUrl } = await load();
    fetchMock.mockResolvedValue(imageResponse());

    const result = await fetchImageAsDataUrl(`${STORAGE}/logo.png`);
    expect(result).toBe(`data:image/png;base64,${PNG.toString('base64')}`);
  });

  it('carries a timeout and refuses to follow a redirect', async () => {
    // A redirect could leave the allowlist — the check only ever saw the first
    // URL. And Satori's own fetch has no timeout at all, which is the reason
    // the fetch happens here instead of inside the render.
    const { fetchImageAsDataUrl } = await load();
    fetchMock.mockResolvedValue(imageResponse());

    await fetchImageAsDataUrl(`${STORAGE}/logo.png`);
    const init = fetchMock.mock.calls[0][1];
    expect(init.redirect).toBe('error');
    expect(init.signal).toBeInstanceOf(AbortSignal);
  });

  it.each([
    ['a non-image content type', imageResponse(PNG, 'text/html')],
    ['a 404', imageResponse(PNG, 'image/png', { status: 404 })],
    [
      'a declared size over the cap',
      imageResponse(PNG, 'image/png', { length: String(50 * 1024 * 1024) }),
    ],
  ])('answers null for %s', async (_label, response) => {
    const { fetchImageAsDataUrl } = await load();
    fetchMock.mockResolvedValue(response);
    expect(await fetchImageAsDataUrl(`${STORAGE}/logo.png`)).toBeNull();
  });

  it('answers null for a body over the cap even when the header lied', async () => {
    const { fetchImageAsDataUrl } = await load();
    fetchMock.mockResolvedValue(
      imageResponse(Buffer.alloc(6 * 1024 * 1024), 'image/png', {
        length: '10',
      }),
    );
    expect(await fetchImageAsDataUrl(`${STORAGE}/logo.png`)).toBeNull();
  });

  it('answers null rather than throwing when the fetch fails', async () => {
    // The whole point: a card loses its picture, the post still renders.
    const { fetchImageAsDataUrl } = await load();
    fetchMock.mockRejectedValue(new Error('timed out'));
    await expect(
      fetchImageAsDataUrl(`${STORAGE}/logo.png`),
    ).resolves.toBeNull();
  });

  it('logs an origin, never the full attacker-supplied URL', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const { fetchImageAsDataUrl } = await load();
    await fetchImageAsDataUrl('https://evil.example/secret-path?token=abc');

    const logged = JSON.stringify(warn.mock.calls);
    expect(logged).toContain('https://evil.example');
    expect(logged).not.toContain('secret-path');
    expect(logged).not.toContain('token=abc');
  });
});
