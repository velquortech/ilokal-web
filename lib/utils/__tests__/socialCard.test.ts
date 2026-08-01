/**
 * The business share card.
 *
 * Guards the two defects this helper was written for, both of which shipped:
 * Next replacing (not merging) a parent `openGraph`, and `twitter:image`
 * falling through to the root file-convention card while `og:image` showed the
 * shop.
 */

import { describe, it, expect } from 'vitest';
import { businessSocialCard } from '@/lib/utils/socialCard';

const BASE = {
  name: 'Kap Ising’s Café',
  description: 'Single-origin from Antique',
  url: '/explore/abc',
};

describe('businessSocialCard', () => {
  it('restates every field a replaced parent openGraph would have dropped', () => {
    const { openGraph } = businessSocialCard({ ...BASE, logo: '/l.png' });
    // Declaring openGraph in a route REPLACES the root layout's object, so a
    // page that sets only title+images loses all of these.
    expect(openGraph).toMatchObject({
      siteName: 'iLokal',
      type: 'website',
      locale: 'en_PH',
      url: '/explore/abc',
    });
  });

  it('points twitter:image at the same picture as og:image', () => {
    const card = businessSocialCard({ ...BASE, banner: '/b.png' });
    expect(card.openGraph?.images).toEqual(['/b.png']);
    expect(card.twitter?.images).toEqual(['/b.png']);
  });

  it('prefers the landscape banner over the square logo', () => {
    const card = businessSocialCard({
      ...BASE,
      banner: '/b.png',
      logo: '/l.png',
    });
    expect(card.openGraph?.images).toEqual(['/b.png']);
  });

  it('only gives a real banner the large card', () => {
    // A square logo stretched to 1200x630 is pillarboxed with grey bars.
    expect(
      businessSocialCard({ ...BASE, banner: '/b.png' }).twitter?.card,
    ).toBe('summary_large_image');
    expect(businessSocialCard({ ...BASE, logo: '/l.png' }).twitter?.card).toBe(
      'summary',
    );
  });

  it('omits images entirely when the shop has none', () => {
    // Absent, not empty: an empty array would emit a blank tag instead of
    // letting the root opengraph-image.png be inherited.
    const card = businessSocialCard(BASE);
    expect(card.openGraph).not.toHaveProperty('images');
    expect(card.twitter).not.toHaveProperty('images');
    expect(card.twitter?.card).toBe('summary');
  });

  it('brands the social title, which the root title template never reaches', () => {
    const { openGraph, twitter } = businessSocialCard({ ...BASE });
    expect(openGraph?.title).toBe('Kap Ising’s Café · iLokal');
    expect(twitter?.title).toBe('Kap Ising’s Café · iLokal');
  });
});
