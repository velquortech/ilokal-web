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
  /**
   * A generated 1200×630 branded card (absolute or metadataBase-relative).
   * Wins over banner and logo, and earns `summary_large_image` — it is
   * already the landscape shape crawlers pillarbox a square into.
   */
  cardImage?: string | null;
  /** Absolute or metadataBase-relative canonical path for this page. */
  url: string;
};

/**
 * The explicit return shape. Next's own `Twitter` type is a union that also
 * admits a card-less `TwitterMetadata` member, so a `Pick<Metadata, 'twitter'>`
 * annotation made `.card` unreadable. Each branch here pins `card` to a single
 * literal, and every branch is structurally assignable to a `Metadata`
 * `twitter` constituent — so routes can still spread the result wholesale.
 */
export type BusinessSocialCardResult = {
  openGraph: NonNullable<Metadata['openGraph']>;
  twitter:
    | {
        card: 'summary_large_image';
        title: string;
        description: string;
        images?: string[];
      }
    | {
        card: 'summary';
        title: string;
        description: string;
        images?: string[];
      };
};

export function businessSocialCard({
  name,
  description,
  banner,
  logo,
  cardImage,
  url,
}: BusinessCard): BusinessSocialCardResult {
  const image = cardImage || banner || logo || undefined;
  const title = `${name} · ${SITE_NAME}`;

  const base = {
    title,
    description,
    ...(image ? { images: [image] } : {}),
  };

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
    // A square logo stretched into a 1200x630 card gets pillarboxed with grey
    // bars, so only a landscape image earns the large card — a real banner or
    // the generated branded card, both already 1200x630-ish.
    twitter:
      cardImage || banner
        ? { ...base, card: 'summary_large_image' }
        : { ...base, card: 'summary' },
  };
}
