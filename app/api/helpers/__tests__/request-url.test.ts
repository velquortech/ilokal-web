import { describe, it, expect, afterEach } from 'vitest';
import { NextRequest } from 'next/server';
import { resolveAppBaseUrl } from '../request-url';

const ORIGINAL = process.env.NEXT_PUBLIC_APP_URL;

afterEach(() => {
  process.env.NEXT_PUBLIC_APP_URL = ORIGINAL;
});

function makeRequest(url: string, headers: Record<string, string> = {}) {
  return new NextRequest(url, { headers });
}

describe('resolveAppBaseUrl', () => {
  it('uses NEXT_PUBLIC_APP_URL when it is a real https URL', () => {
    process.env.NEXT_PUBLIC_APP_URL = 'https://ilokal.app';
    expect(resolveAppBaseUrl()).toBe('https://ilokal.app');
  });

  it('strips a trailing slash from the env value', () => {
    process.env.NEXT_PUBLIC_APP_URL = 'https://ilokal.app/';
    expect(resolveAppBaseUrl()).toBe('https://ilokal.app');
  });

  it('ignores a localhost env value and derives from the request host', () => {
    process.env.NEXT_PUBLIC_APP_URL = 'http://localhost:3000';
    const req = makeRequest('https://api.ilokal.app/api/mobile/x', {
      host: 'api.ilokal.app',
    });
    expect(resolveAppBaseUrl(req)).toBe('https://api.ilokal.app');
  });

  it('prefers x-forwarded-host/proto over the direct host (proxied APK build)', () => {
    process.env.NEXT_PUBLIC_APP_URL = '';
    const req = makeRequest('http://internal:8080/api/mobile/x', {
      host: 'internal:8080',
      'x-forwarded-host': 'preview.ilokal.app',
      'x-forwarded-proto': 'https',
    });
    expect(resolveAppBaseUrl(req)).toBe('https://preview.ilokal.app');
  });

  it('falls back to the env value when no request is available', () => {
    process.env.NEXT_PUBLIC_APP_URL = 'http://localhost:3000';
    expect(resolveAppBaseUrl()).toBe('http://localhost:3000');
  });

  it('prefers the live request host over a real but stale env URL', () => {
    // Regression: env pinned to a dead deployment alias must not win over the
    // host the request actually reached, or share links 404.
    process.env.NEXT_PUBLIC_APP_URL = 'https://stale-alias.vercel.app';
    const req = makeRequest('https://current-deploy.vercel.app/api/mobile/x', {
      host: 'current-deploy.vercel.app',
    });
    expect(resolveAppBaseUrl(req)).toBe('https://current-deploy.vercel.app');
  });
});
