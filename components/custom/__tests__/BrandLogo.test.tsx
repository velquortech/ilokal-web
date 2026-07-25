/**
 * BrandLogo — inline "Hablon Weave" lockup (see .claude docs / public/brand
 * README). Pure presentational server components, so react-dom/server static
 * markup is enough — no DOM environment needed.
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
    expect(html).toContain('role="img"');
    expect(html).toContain('aria-label="iLokal"');
    expect(html).toContain('width="32"');
    expect(html).toContain('viewBox="0 0 48 48"');
  });

  it('defaults to the theme-aware palette (dark: swap per brand README)', () => {
    const html = renderToStaticMarkup(<BrandMark />);
    expect(html).toContain('fill-[#65A30D] dark:fill-[#84CC16]');
    expect(html).toContain('fill-white dark:fill-[#1A1A1A]');
  });

  it('pins the palette for surfaces with their own theming', () => {
    const dark = renderToStaticMarkup(<BrandMark palette="dark" />);
    expect(dark).toContain('fill-[#84CC16]');
    expect(dark).toContain('fill-[#1A1A1A]');
    expect(dark).not.toContain('dark:fill-');

    const light = renderToStaticMarkup(<BrandMark palette="light" />);
    expect(light).toContain('fill-[#65A30D]');
    expect(light).not.toContain('dark:fill-');
  });
});

describe('BrandWordmark', () => {
  it('renders the wordmark in Geist 800 with brand tracking', () => {
    const html = renderToStaticMarkup(<BrandWordmark />);
    expect(html).toContain('iLokal');
    expect(html).toContain('font-giest');
    expect(html).toContain('font-extrabold');
    expect(html).toContain('tracking-[-0.035em]');
  });
});

describe('BrandLogo', () => {
  it('renders mark + wordmark as one lockup', () => {
    const html = renderToStaticMarkup(<BrandLogo />);
    expect(html).toContain('aria-label="iLokal"');
    expect(html).toContain('iLokal');
    expect(html).toContain('text-primary');
  });
});
