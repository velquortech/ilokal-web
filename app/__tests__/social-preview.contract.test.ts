/**
 * Link-preview contract.
 *
 * Facebook, Messenger, X and LinkedIn all read Open Graph, and all of them
 * need ABSOLUTE image URLs — a crawler has no page to resolve `/foo.png`
 * against. Next builds those from `metadataBase`; without it the
 * `app/opengraph-image.png` file convention silently produces nothing usable
 * and every share renders as a bare text card.
 *
 * Asserted at the source level rather than by booting the app: `app/layout.tsx`
 * pulls in `next/font/local` and `globals.css`, neither of which loads under
 * the node test environment.
 */

import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = join(__dirname, '../..');
const layout = readFileSync(join(ROOT, 'app/layout.tsx'), 'utf8');

describe('open graph', () => {
  it('sets metadataBase, without which image URLs stay relative', () => {
    expect(layout).toMatch(/metadataBase:\s*new URL\(/);
  });

  it('derives the base from NEXT_PUBLIC_APP_URL, not from the request', () => {
    // A crawler can be pointed at any host and the Host header is
    // attacker-controlled, so the canonical origin must be configuration.
    expect(layout).toContain('process.env.NEXT_PUBLIC_APP_URL');
    expect(layout).not.toMatch(/headers\(\)|x-forwarded-host/);
  });

  it('declares the tags a share card is built from', () => {
    for (const key of ['openGraph', 'siteName', 'alternates', 'twitter']) {
      expect(layout).toContain(key);
    }
  });
});

describe('share card image', () => {
  const CARDS = ['app/opengraph-image.png', 'app/twitter-image.png'];

  it.each(CARDS)('%s exists', (relative) => {
    expect(existsSync(join(ROOT, relative))).toBe(true);
  });

  it.each(CARDS)(
    '%s is 1200x630 and under Facebook’s size ceiling',
    (relative) => {
      const file = join(ROOT, relative);
      // PNG header: width and height are big-endian uint32 at bytes 16 and 20.
      const header = readFileSync(file).subarray(0, 24);
      expect(header.readUInt32BE(16)).toBe(1200);
      expect(header.readUInt32BE(20)).toBe(630);
      // Facebook's hard limit is 8 MB; anything near it is a slow first scrape.
      expect(statSync(file).size).toBeLessThan(1_000_000);
    },
  );

  it.each(CARDS)(
    '%s has alt text for screen readers on the post',
    (relative) => {
      expect(existsSync(join(ROOT, relative.replace('.png', '.alt.txt')))).toBe(
        true,
      );
    },
  );
});
