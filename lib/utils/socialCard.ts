import type { Metadata } from 'next';

/**
 * Build the Open Graph + Twitter pair for a business page.
 *
 * Exists because Next does NOT deep-merge `openGraph`: declaring it in a route
 * REPLACES the parent's object wholesale, so a page that sets only
 * `{ title, images }` silently drops `og:site_name`, `og:type`, `og:url` and
 * `og:locale` from the root layout. Both public business routes had exactly
 * that, and a Facebook card with no site name looks like a scrape.
 *
 * It also keeps `twitter:image` pointing at the same picture as `og:image`.
 * Without an explicit `twitter` block the root's `twitter-image.png` file
 * convention wins, so a shop previewed as its own banner on Facebook and as
 * the generic iLokal card on X.
 */

const SITE_NAME = 'iLokal';

export type BusinessCard = {
  name: string;
  description: string;
  /** Landscape shop banner, already an absolute URL. Preferred when present. */
  banner?: string | null;
  /** Square shop logo, already an absolute URL. */
  logo?: string | null;
  /** Absolute or metadataBase-relative canonical path for this page. */
  url: string;
};

export function businessSocialCard({
  name,
  description,
  banner,
  logo,
  url,
}: BusinessCard): Pick<Metadata, 'openGraph' | 'twitter'> {
  const image = banner || logo || undefined;

  // A square logo stretched into a 1200x630 card gets pillarboxed with grey
  // bars, so only a real landscape banner earns the large card.
  const card = banner ? 'summary_large_image' : 'summary';
  const title = `${name} · ${SITE_NAME}`;

  return {
    openGraph: {
      title,
      description,
      siteName: SITE_NAME,
      type: 'website',
      locale: 'en_PH',
      url,
      // Omitted entirely when the shop has no imagery, so the root
      // `opengraph-image.png` is inherited rather than emitting an empty tag.
      ...(image ? { images: [image] } : {}),
    },
    twitter: {
      card,
      title,
      description,
      ...(image ? { images: [image] } : {}),
    },
  };
}
