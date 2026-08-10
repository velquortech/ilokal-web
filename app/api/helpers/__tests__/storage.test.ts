import { describe, it, expect } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import { resolveStorageUrl } from '../storage';

/**
 * Minimal storage stub: getPublicUrl behaves like supabase-js — it URL-encodes
 * the path it is handed — and records the last path it was called with.
 */
function makeClient() {
  let lastPath: string | null = null;
  const client = {
    storage: {
      from: (bucket: string) => ({
        getPublicUrl: (path: string) => {
          lastPath = path;
          return {
            data: {
              publicUrl: `https://x.supabase.co/storage/v1/object/public/${bucket}/${encodeURIComponent(path)}`,
            },
          };
        },
      }),
    },
  } as unknown as SupabaseClient;
  return { client, lastPath: () => lastPath };
}

describe('resolveStorageUrl', () => {
  it('returns null for empty input', () => {
    const { client } = makeClient();
    expect(resolveStorageUrl(client, 'interior-images', null)).toBeNull();
    expect(resolveStorageUrl(client, 'interior-images', undefined)).toBeNull();
    expect(resolveStorageUrl(client, 'interior-images', '')).toBeNull();
  });

  it('passes absolute URLs through verbatim', () => {
    const { client, lastPath } = makeClient();
    const url = 'https://example.com/photo.webp';
    expect(resolveStorageUrl(client, 'shop-banners', url)).toBe(url);
    expect(lastPath()).toBeNull();
  });

  it('passes a plain path to getPublicUrl untouched', () => {
    const { client, lastPath } = makeClient();
    resolveStorageUrl(client, 'shop-logos', 'b1/logo-123.webp');
    expect(lastPath()).toBe('b1/logo-123.webp');
  });

  it('decodes a percent-encoded path so getPublicUrl does not double-encode', () => {
    const { client, lastPath } = makeClient();
    const url = resolveStorageUrl(
      client,
      'interior-images',
      'b1/1786278978809-Screenshot%202026-08-08%20095928.webp',
    );
    // getPublicUrl must receive the raw key (spaces), not the encoded form.
    expect(lastPath()).toBe('b1/1786278978809-Screenshot 2026-08-08 095928.webp');
    // And the resulting URL is encoded exactly once (%20, never %2520).
    expect(url).toContain('Screenshot%202026-08-08%20095928.webp');
    expect(url).not.toContain('%2520');
  });

  it('survives a malformed escape (literal % in a filename) without throwing', () => {
    const { client, lastPath } = makeClient();
    const url = resolveStorageUrl(client, 'interior-images', 'b1/50%off.webp');
    expect(url).toContain('50%25off.webp');
    expect(lastPath()).toBe('b1/50%off.webp');
  });
});
