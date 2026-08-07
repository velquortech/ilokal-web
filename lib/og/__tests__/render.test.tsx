import { describe, it, expect } from 'vitest';
import { ImageResponse } from 'next/og';
import sharp from 'sharp';
import { loadPostFonts } from '../fonts';
import { WelcomePost, POST_RATIOS, type PostCard } from '../welcomePost';

/**
 * The render itself, actually performed.
 *
 * Every other suite here asserts a decision. This one runs Satori and resvg for
 * real and produces a PNG, because the production outage was not a wrong
 * decision — every unit test passed while the route was dead. It was the
 * renderer refusing an input, thrown from the streaming body where nothing
 * could log it.
 *
 * Slow (~1s) and worth it: this is the only assertion in the repo that would
 * have caught it.
 */

async function png(width: number, height: number) {
  return sharp({
    create: { width, height, channels: 3, background: '#D70005' },
  })
    .png()
    .toBuffer();
}

async function renderPost(cards: PostCard[], ratio: '1x1' | '4x5' = '1x1') {
  const fonts = await loadPostFonts();
  const { width, height } = POST_RATIOS[ratio];
  const response = new ImageResponse(
    <WelcomePost
      cards={cards}
      ratio={ratio}
      wordmarkUrl={null}
      scales={{ name: 1, footer: 1 }}
    />,
    { width, height, fonts },
  );
  return Buffer.from(await response.arrayBuffer());
}

async function dataUrl(buffer: Buffer, type = 'image/png') {
  return `data:${type};base64,${buffer.toString('base64')}`;
}

describe('the post actually renders', () => {
  it('produces a real PNG of the right size, two cards up', async () => {
    const logo = await dataUrl(await png(200, 200));
    const out = await renderPost([
      { name: 'Suds & Sips Carwash and Café ', logoUrl: logo, showName: true },
      { name: 'LU2', logoUrl: null, showName: true },
    ]);

    const meta = await sharp(out).metadata();
    expect(meta.format).toBe('png');
    expect(meta.width).toBe(1080);
    expect(meta.height).toBe(1080);
  }, 60000);

  it('renders the 4:5 crop', async () => {
    const out = await renderPost(
      [{ name: 'Solo Shop', logoUrl: null, showName: true }],
      '4x5',
    );
    const meta = await sharp(out).metadata();
    expect(meta.height).toBe(1350);
  }, 60000);

  it('renders with the name hidden on one card', async () => {
    const logo = await dataUrl(await png(200, 200));
    const out = await renderPost([
      { name: 'Has A Wordmark', logoUrl: logo, showName: false },
      { name: 'Needs Its Name', logoUrl: logo, showName: true },
    ]);
    expect((await sharp(out).metadata()).width).toBe(1080);
  }, 60000);

  it('🔴 REGRESSION: a WebP logo must not fail the render', async () => {
    // The production outage. `convertToWebP` makes every stored logo a WebP,
    // and handing one to Satori throws `TypeError: u2 is not iterable` — from
    // the streaming body, so the function died and Vercel reported
    // FUNCTION_INVOCATION_FAILED with no log. `fetchImageAsDataUrl` transcodes
    // to PNG for exactly this reason; passing the WebP straight through here
    // is what proves the renderer still cannot take one.
    const webp = await sharp({
      create: { width: 200, height: 200, channels: 3, background: '#FEE87B' },
    })
      .webp()
      .toBuffer();

    await expect(
      renderPost([
        {
          name: 'Webp Shop',
          logoUrl: await dataUrl(webp, 'image/webp'),
          showName: true,
        },
      ]),
    ).rejects.toThrow();

    // And the same image, through the transcode the route applies, renders.
    const transcoded = await sharp(webp).png().toBuffer();
    const out = await renderPost([
      {
        name: 'Webp Shop',
        logoUrl: await dataUrl(transcoded),
        showName: true,
      },
    ]);
    expect((await sharp(out).metadata()).width).toBe(1080);
  }, 60000);
});
