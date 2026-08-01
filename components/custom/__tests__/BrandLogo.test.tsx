/**
 * BrandLogo — iLokal identity v1.0 lockup (see `public/brand/README.md`).
 * Pure presentational server components, so react-dom/server static markup is
 * enough — no DOM environment needed.
 */

import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import {
  BrandLogo,
  BrandMark,
  BrandWordmark,
} from '@/components/custom/BrandLogo';

describe('BrandMark', () => {
  it('renders the accessible mark at the requested size', () => {
    const html = renderToStaticMarkup(<BrandMark size={32} />);
    expect(html).toContain('alt="iLokal"');
    expect(html).toContain('width:32px');
    expect(html).toContain('height:32px');
  });

  it('defaults to the theme-aware palette', () => {
    const html = renderToStaticMarkup(<BrandMark />);
    // Brick Ember on light, the lifted #DD2920 "flame" tile on dark — Brick
    // Ember itself is only 3.23:1 against Charcoal.
    expect(html).toContain('ilokal-mark-brick.png');
    expect(html).toContain('ilokal-mark-flame.png');
    expect(html).toContain('dark:hidden');
    expect(html).toContain('hidden dark:block');
  });

  it('pins the palette for surfaces with their own theming', () => {
    const dark = renderToStaticMarkup(<BrandMark palette="dark" />);
    expect(dark).toContain('ilokal-mark-flame.png');
    expect(dark).not.toContain('ilokal-mark-brick.png');
    expect(dark).not.toContain('dark:');

    const light = renderToStaticMarkup(<BrandMark palette="light" />);
    expect(light).toContain('ilokal-mark-brick.png');
    expect(light).not.toContain('ilokal-mark-flame.png');
    expect(light).not.toContain('dark:');
  });

  it('exposes only one accessible name in the auto pair', () => {
    const html = renderToStaticMarkup(<BrandMark />);
    // The dark twin is decorative — both being labelled would announce the
    // brand twice on every page.
    expect(html.match(/alt="iLokal"/g)).toHaveLength(1);
    expect(html).toContain('aria-hidden');
  });
});

describe('BrandWordmark', () => {
  it('renders the drawn wordmark scaled to the inherited font size', () => {
    const html = renderToStaticMarkup(<BrandWordmark />);
    expect(html).toContain('ilokal-wordmark-brick.png');
    // em-based height is what keeps `text-base` / `text-lg` call sites working
    // now that the wordmark is an asset rather than live text.
    expect(html).toContain('h-[1.15em]');
    expect(html).toContain('w-auto');
  });

  it('uses the Porcelain cut on dark surfaces', () => {
    const html = renderToStaticMarkup(<BrandWordmark palette="dark" />);
    expect(html).toContain('ilokal-wordmark-porcelain.png');
    expect(html).not.toContain('ilokal-wordmark-brick.png');
  });
});

describe('BrandLogo', () => {
  it('renders mark + wordmark as one lockup', () => {
    const html = renderToStaticMarkup(<BrandLogo />);
    expect(html).toContain('ilokal-mark-brick.png');
    expect(html).toContain('ilokal-wordmark-brick.png');
    expect(html).toContain('inline-flex items-center gap-2');
  });

  it('propagates a pinned palette to both halves', () => {
    const html = renderToStaticMarkup(<BrandLogo palette="dark" />);
    expect(html).toContain('ilokal-mark-flame.png');
    expect(html).toContain('ilokal-wordmark-porcelain.png');
    expect(html).not.toContain('dark:');
  });
});
