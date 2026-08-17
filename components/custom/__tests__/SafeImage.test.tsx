// @vitest-environment happy-dom

/**
 * SafeImage — the single owner of the `unoptimized` + broken-image fallback
 * rules for every storage-image surface (logos, banners, products, events,
 * interiors, avatars).
 *
 * The critical contract under test: with `unoptimized`, `next/image` emits the
 * storage URL verbatim (no `/_next/image` proxy) — routing storage WebP through
 * the optimizer is exactly the bug that used to blank these images. And when a
 * URL errors, the placeholder replaces the browser's broken glyph — the
 * "logo container" case the fallback pass was written for.
 */

import * as React from 'react';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  SafeImage,
  localStorageFallbackFor,
} from '@/components/custom/SafeImage';

// React 19 requires this flag before `act()` will run (react-dom/client under
// happy-dom — same requirement GlobalSearch.test.tsx's stack satisfies).
(globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true;

const STORAGE = 'https://cdn.ilokal.test/storage/v1/object/public/logo-images';

describe('SafeImage — unoptimized storage contract', () => {
  it('emits the storage URL verbatim — never through the /_next/image proxy', () => {
    const url = `${STORAGE}/shop-logo.webp`;
    const html = renderToStaticMarkup(<SafeImage src={url} alt="" fill />);

    expect(html).not.toContain('/_next/image');
    expect(html).toContain(`src="${url}"`);
  });

  it('passes through fill, priority and className untouched', () => {
    const html = renderToStaticMarkup(
      <SafeImage
        src={`${STORAGE}/banner.webp`}
        alt=""
        fill
        priority
        className="object-cover"
      />,
    );

    // `fill` images are positioned by style, not width/height attributes.
    expect(html).toContain('data-nimg="fill"');
    expect(html).toContain('object-cover');
    // `priority` emits a preload <link> for the eager image.
    expect(html).toContain('<link rel="preload" as="image"');
  });
});

describe('localStorageFallbackFor — offline local-storage retry', () => {
  const LOCAL = 'http://127.0.0.1:54321';

  beforeEach(() => {
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', LOCAL);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('rewrites an absolute cloud URL to the app storage origin, same path', () => {
    const cloud =
      'https://skvgasimllpyhyudpycu.supabase.co/storage/v1/object/public/logo-images/x.webp';
    expect(localStorageFallbackFor(cloud)).toBe(
      `${LOCAL}/storage/v1/object/public/logo-images/x.webp`,
    );
  });

  it('returns null for a relative path (already local)', () => {
    expect(localStorageFallbackFor('logo-images/x.webp')).toBeNull();
  });

  it('returns null for a non-storage host (external stock photo)', () => {
    expect(
      localStorageFallbackFor('https://images.unsplash.com/photo-1'),
    ).toBeNull();
  });

  it('returns null when the URL is already on the app origin (no point retrying)', () => {
    expect(
      localStorageFallbackFor(
        `${LOCAL}/storage/v1/object/public/logo-images/x.webp`,
      ),
    ).toBeNull();
  });

  it('returns null when no storage origin is configured (e.g. prod-built test env)', () => {
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', '');
    expect(
      localStorageFallbackFor(
        'https://skvgasimllpyhyudpycu.supabase.co/storage/v1/object/public/logo-images/x.webp',
      ),
    ).toBeNull();
  });
});

describe('SafeImage — broken-image fallback', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
  });

  const errorTheImage = () => {
    const img = container.querySelector('img');
    expect(img, 'expected an <img> to be rendered').not.toBeNull();
    act(() => {
      img!.dispatchEvent(new Event('error', { bubbles: true }));
    });
  };

  it('swaps to the placeholder when the image errors', () => {
    act(() => {
      root.render(<SafeImage src={`${STORAGE}/gone.webp`} alt="" fill />);
    });
    expect(container.querySelector('img')).not.toBeNull();

    errorTheImage();

    // The <img> is gone; the muted placeholder (with its ImageOff icon) is in
    // its place — the graceful alternative to the browser's broken glyph.
    expect(container.querySelector('img')).toBeNull();
    expect(container.querySelector('svg')).not.toBeNull();
  });

  it('keeps the placeholder after the error (no flapping back)', () => {
    act(() => {
      root.render(<SafeImage src={`${STORAGE}/gone.webp`} alt="" fill />);
    });
    errorTheImage();

    // A re-render with the same src must stay on the placeholder.
    act(() => {
      root.render(<SafeImage src={`${STORAGE}/gone.webp`} alt="" fill />);
    });
    expect(container.querySelector('img')).toBeNull();
  });

  it('re-arms when the src changes — replacing an image recovers from the old failure', () => {
    act(() => {
      root.render(<SafeImage src={`${STORAGE}/gone.webp`} alt="" fill />);
    });
    errorTheImage();
    expect(container.querySelector('img')).toBeNull();

    // A new src (e.g. an uploader preview after re-uploading) must mount a
    // fresh <img> rather than staying stuck on the old failure.
    act(() => {
      root.render(<SafeImage src={`${STORAGE}/new-logo.webp`} alt="" fill />);
    });
    expect(container.querySelector('img')).not.toBeNull();
  });

  it('inherits the image className for width/height images (round avatars stay round)', () => {
    act(() => {
      root.render(
        <SafeImage
          src={`${STORAGE}/avatar.webp`}
          alt=""
          width={40}
          height={40}
          className="h-10 w-10 rounded-full object-cover"
        />,
      );
    });
    errorTheImage();

    const placeholder = container.querySelector('div');
    expect(placeholder?.className).toContain('rounded-full');
    expect(placeholder?.className).toContain('h-10 w-10');
  });
});

describe('SafeImage — offline retry of absolute cloud URLs', () => {
  let container: HTMLDivElement;
  let root: Root;

  const CLOUD =
    'https://skvgasimllpyhyudpycu.supabase.co/storage/v1/object/public/logo-images/cloud-logo.webp';
  const LOCAL = 'http://127.0.0.1:54321';

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', LOCAL);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    vi.unstubAllEnvs();
  });

  const errorTheImage = () => {
    const img = container.querySelector('img');
    expect(img, 'expected an <img> to be rendered').not.toBeNull();
    act(() => {
      img!.dispatchEvent(new Event('error', { bubbles: true }));
    });
  };

  it('retries the local copy once before the placeholder (offline dev)', () => {
    act(() => {
      root.render(<SafeImage src={CLOUD} alt="" fill />);
    });
    expect(container.querySelector('img')?.getAttribute('src')).toContain(
      CLOUD,
    );

    // First error: the cloud host is unreachable (offline) — the component
    // retries the SAME path against local storage, where pull-live synced it.
    errorTheImage();
    const retried = container.querySelector('img');
    expect(retried, 'local retry should still be an <img>').not.toBeNull();
    expect(retried!.getAttribute('src')).toContain(LOCAL);
    expect(retried!.getAttribute('src')).toContain(
      '/storage/v1/object/public/logo-images/cloud-logo.webp',
    );
    expect(container.querySelector('svg')).toBeNull();

    // Second error: the local copy failed too — now the placeholder.
    errorTheImage();
    expect(container.querySelector('img')).toBeNull();
    expect(container.querySelector('svg')).not.toBeNull();
  });

  it('does not retry (straight to placeholder) when the URL is already local', () => {
    const localUrl = `${LOCAL}/storage/v1/object/public/logo-images/x.webp`;
    act(() => {
      root.render(<SafeImage src={localUrl} alt="" fill />);
    });
    errorTheImage();
    expect(container.querySelector('img')).toBeNull();
    expect(container.querySelector('svg')).not.toBeNull();
  });
});
