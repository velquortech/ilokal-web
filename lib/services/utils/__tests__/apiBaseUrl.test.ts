/**
 * Where the browser sends this app's API calls.
 *
 * The regression being pinned: `baseURL` was a hardcoded
 * `http://localhost:3000` (with `NEXT_PUBLIC_API_URL` set nowhere in the repo),
 * so in production the page loaded from the real domain and then POSTed to the
 * visitor's own machine. Axios reported `Network Error` with no response and no
 * status — every browser axios call in production, not just registration.
 *
 * An absolute base is only correct on the server, where there is no origin to
 * resolve against.
 */

import { describe, it, expect, afterEach, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { apiBaseUrl } from '../apiBaseUrl';

const ROOT = join(__dirname, '..', '..', '..', '..');

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe('apiBaseUrl', () => {
  it('is empty in the browser, so requests stay same-origin', () => {
    vi.stubGlobal('window', {} as Window);

    expect(apiBaseUrl()).toBe('');
  });

  it('stays empty in the browser even when an API url is configured', () => {
    // A configured absolute host is still wrong client-side: it makes the
    // request cross-origin from every preview deployment and every LAN address.
    vi.stubGlobal('window', {} as Window);
    vi.stubEnv('NEXT_PUBLIC_API_URL', 'https://ilokal.shop');

    expect(apiBaseUrl()).toBe('');
  });

  it('falls back to the app url on the server, where fetch needs absolute', () => {
    vi.stubEnv('NEXT_PUBLIC_API_URL', '');
    vi.stubEnv('NEXT_PUBLIC_APP_URL', 'https://ilokal.shop');

    expect(apiBaseUrl()).toBe('https://ilokal.shop');
  });

  it('prefers an explicit API url over the app url on the server', () => {
    vi.stubEnv('NEXT_PUBLIC_API_URL', 'https://api.ilokal.shop');
    vi.stubEnv('NEXT_PUBLIC_APP_URL', 'https://ilokal.shop');

    expect(apiBaseUrl()).toBe('https://api.ilokal.shop');
  });
});

describe('no client re-hardcodes an origin', () => {
  const sources = ['lib/services/utils/apiClient.ts', 'lib/services/client.ts'];

  it('routes every base through apiBaseUrl()', () => {
    for (const relative of sources) {
      const source = readFileSync(join(ROOT, relative), 'utf8');

      expect(source).toContain('apiBaseUrl');
      // The exact shape of the bug: an origin literal standing in for the base.
      expect(source).not.toMatch(
        /(baseURL|DEFAULT_BASE)[^\n]*['"`]https?:\/\//,
      );
    }
  });
});
