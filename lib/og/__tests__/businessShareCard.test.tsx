import { describe, it, expect } from 'vitest';
import { ImageResponse } from 'next/og';
import sharp from 'sharp';

import { loadPostFonts } from '../fonts';
import {
  BusinessShareCard,
  OG_LANDSCAPE,
  shareNameFontSize,
} from '../businessShareCard';

/**
 * The render itself, actually performed.
 *
 * Mirrors the welcome-post render suite for the same reason: the production
 * outage there was not a wrong decision but the renderer refusing an input,
 * thrown from the streaming body where nothing could log it. This is the only
 * assertion that would catch that class of failure for this card.
 */

async function png(width: number, height: number) {
  return sharp({
    create: { width, height, channels: 3, background: '#D70005' },
  })
    .png()
    .toBuffer();
}

async function renderCard(name: string, logoUrl: string | null) {
  const fonts = await loadPostFonts();
  const response = new ImageResponse(
    <BusinessShareCard name={name} logoUrl={logoUrl} wordmarkUrl={null} />,
    { ...OG_LANDSCAPE, fonts },
  );
  return Buffer.from(await response.arrayBuffer());
}

async function dataUrl(buffer: Buffer) {
  return `data:image/png;base64,${buffer.toString('base64')}`;
}

describe('the share card actually renders', () => {
  it('produces a real 1200×630 PNG with a logo', async () => {
    const logo = await dataUrl(await png(400, 400));
    const out = await renderCard('Suds & Sips Carwash and Café ', logo);

    const meta = await sharp(out).metadata();
    expect(meta.format).toBe('png');
    expect(meta.width).toBe(1200);
    expect(meta.height).toBe(630);
  }, 60000);

  it('still renders when the logo is unreachable — initials card', async () => {
    const out = await renderCard('LU2', null);
    const meta = await sharp(out).metadata();
    expect(meta.format).toBe('png');
    expect(meta.width).toBe(1200);
    expect(meta.height).toBe(630);
  }, 60000);
});

describe('shareNameFontSize', () => {
  it('steps down as the name grows, and never clips a 29-char name to one tiny line', () => {
    expect(shareNameFontSize('LU2')).toBe(76);
    // 16 chars (é counts once) — the ≤20 bucket.
    expect(shareNameFontSize('Kap Ising’s Café')).toBe(56);
    expect(shareNameFontSize('Suds & Sips Carwash and Café')).toBe(50);
  });

  it('ignores the leading/trailing spaces real names carry', () => {
    // "Suds & Sips Carwash and Café " — trailing space padded the old count.
    expect(shareNameFontSize('Suds & Sips Carwash and Café ')).toBe(50);
  });
});
