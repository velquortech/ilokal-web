/**
 * @vitest-environment happy-dom
 *
 * Landing redesign — structural guards, not snapshots.
 *
 * These assert the contracts the design depends on: every jump-nav target
 * exists, the sections are in the documented order, the one numbered sequence
 * is the only numbered sequence, and nothing links to a section that was
 * removed.
 */

import { act } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createRoot, type Root } from 'react-dom/client';
import { MotionConfig } from 'motion/react';
import {
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';
import {
  navLinks,
  footerColumns,
  cravings,
  deals,
  categories,
  filterDeals,
} from '../data';
import { Hero } from '../sections/Hero';
import { NearYou } from '../sections/NearYou';
import { DealsWall } from '../sections/DealsWall';
import { CounterMoment } from '../sections/CounterMoment';
import { Voices } from '../sections/Voices';
import { ForBusiness } from '../sections/ForBusiness';
import { FinalCta } from '../sections/FinalCta';

vi.mock('next/link', () => ({
  default: ({
    href,
    children,
    ...rest
  }: {
    href: string;
    children: React.ReactNode;
  }) => (
    <a href={href} data-next-link="" {...rest}>
      {children}
    </a>
  ),
}));

vi.mock('next/image', () => ({
  default: ({ src, alt }: { src: string; alt: string }) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={typeof src === 'string' ? src : ''} alt={alt} />
  ),
}));

// Everything renders under `reducedMotion: 'always'`, which doubles as the
// reduced-motion coverage the design plan calls for: each section must reach
// its end state with no animation at all. It also makes AnimatePresence exits
// synchronous, so a filtered-out card is really gone from the DOM.
beforeAll(() => {
  (
    globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
  ).IS_REACT_ACT_ENVIRONMENT = true;
});

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  container = document.createElement('div');
  document.body.append(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

function render(node: React.ReactNode) {
  act(() =>
    root.render(<MotionConfig reducedMotion="always">{node}</MotionConfig>),
  );
  return container;
}

describe('jump-nav targets', () => {
  const SECTIONS = [
    ['near-you', NearYou],
    ['deals', DealsWall],
    ['voices', Voices],
    ['businesses', ForBusiness],
  ] as const;

  it.each(SECTIONS)('#%s is rendered by its section', (id, Section) => {
    expect(render(<Section />).querySelector(`#${id}`)).not.toBeNull();
  });

  it('every hash link in the nav and footer resolves to one of them', () => {
    const ids = new Set(SECTIONS.map(([id]) => id));
    const hashes = [...navLinks, ...footerColumns.flatMap((c) => c.links)]
      .map((l) => l.href)
      .filter((h) => h.startsWith('#') && h !== '#');
    expect(hashes.length).toBeGreaterThan(0);
    for (const hash of hashes) expect(ids.has(hash.slice(1))).toBe(true);
  });

  it('cross-surface links from /explore resolve too', async () => {
    // The regression this catches shipped: /explore's nav still pointed at
    // `#shoppers`, `#how` and `#about` after the landing renamed and deleted
    // those sections, so three links scrolled nowhere. `LandingSection` now
    // makes it a build error; this makes it a test failure as well, because
    // the union is only as good as whoever remembers to update it.
    const ids = new Set(SECTIONS.map(([id]) => id));
    const { PUBLIC_NAV_LINKS } =
      await import('@/components/customer/PublicNav');
    const hashes = PUBLIC_NAV_LINKS.map((l) => l.href)
      .filter((h) => h.includes('#'))
      .map((h) => h.slice(h.indexOf('#') + 1));
    expect(hashes.length).toBeGreaterThan(0);
    for (const hash of hashes) expect(ids.has(hash)).toBe(true);
  });

  it('nav hash order matches the page order', () => {
    const order = SECTIONS.map(([id]) => id);
    const navOrder = navLinks
      .map((l) => l.href)
      .filter((h) => h.startsWith('#'))
      .map((h) => h.slice(1));
    expect(navOrder).toEqual(order);
  });
});

describe('nothing is hidden in the server HTML', () => {
  // The regression this guards is real and was shipped: motion's `initial`
  // writes `opacity:0` into the SSR output, so with JS blocked or slow the
  // page rendered blank — headline, stats and half the business list included.
  // Reveals are CSS view-timeline animations now; if anyone reintroduces
  // `initial={{ opacity: 0 }}` on a section, this fails.
  const SECTIONS = [
    ['Hero', Hero],
    ['NearYou', NearYou],
    ['DealsWall', DealsWall],
    ['CounterMoment', CounterMoment],
    ['Voices', Voices],
    ['ForBusiness', ForBusiness],
    ['FinalCta', FinalCta],
  ] as const;

  it.each(SECTIONS)('%s renders visible without JS', (_name, Section) => {
    const html = renderToStaticMarkup(<Section />);
    expect(html).not.toMatch(/opacity:\s*0[;"]/);
    expect(html.length).toBeGreaterThan(200);
  });

  it('the hero deals a real hand, not a stock photograph', () => {
    const html = renderToStaticMarkup(<Hero />);
    // The first pass filled this column with the deck's stock frames and it
    // read as an agency mockup. It carries the live product now, so the shops
    // the search is finding have to actually be in the markup.
    // No apostrophes in the fixtures here — React escapes them to &#x27;.
    for (const shown of ['Batchoy Haus', 'La Paz', '4 min']) {
      expect(html).toContain(shown);
    }
    expect(html).not.toContain('/landing/hero-');
  });

  it('shows the spread as a fan beside the headline and a row below it', () => {
    const html = renderToStaticMarkup(<Hero />);
    // A fan needs height a phone does not have, so both layouts render and
    // CSS picks one. Losing either breakpoint leaves the hand invisible.
    expect(html).toContain('hidden lg:block');
    expect(html).toContain('lg:hidden');
  });

  it('the hero ships its copy, not an empty shell', () => {
    const html = renderToStaticMarkup(<Hero />);
    for (const line of ['The best spots', 'on Google.', 'Start exploring']) {
      expect(html).toContain(line);
    }
  });
});

describe('structure encodes meaning', () => {
  it('the business block is the only numbered sequence on the page', () => {
    // Numbering is honest here (register → verify → post) and nowhere else;
    // the old page ran a second numbered list for shoppers, which was not a
    // sequence at all.
    expect(render(<ForBusiness />).querySelectorAll('ol')).toHaveLength(1);
    for (const Section of [NearYou, Voices, CounterMoment, FinalCta]) {
      expect(render(<Section />).querySelectorAll('ol')).toHaveLength(0);
    }
  });

  it('the claim code is announced once, not character by character', () => {
    const el = render(<CounterMoment />);
    const code = el.querySelector('[aria-label*="claim code"]');
    expect(code).not.toBeNull();
    // Each character tile is decorative — six separate announcements would be
    // meaningless to a screen reader.
    expect(code!.querySelectorAll('[aria-hidden="true"]')).toHaveLength(6);
  });
});

describe('deals wall', () => {
  it('filters in place and keeps the whole filter reachable', async () => {
    const el = render(<DealsWall />);
    const chips = [...el.querySelectorAll('button[aria-pressed]')];
    expect(chips.length).toBe(categories.length);
    expect(el.querySelectorAll('article')).toHaveLength(deals.length);

    const cafes = chips.find((c) => c.textContent?.includes('Cafés'))!;
    await act(async () => {
      cafes.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(cafes.getAttribute('aria-pressed')).toBe('true');
    expect(
      chips.filter((c) => c.getAttribute('aria-pressed') === 'true'),
    ).toHaveLength(1);
    // Every chip survives any result — a filter that can strand you in an
    // empty state with no way back is a trap.
    expect(el.querySelectorAll('button[aria-pressed]')).toHaveLength(
      chips.length,
    );
  });

  it('cards are reachable and straighten on keyboard focus, not just hover', () => {
    const card = render(<DealsWall />).querySelector('article')!;
    expect(card.getAttribute('tabindex')).toBe('0');
    expect(card.className).toContain('focus-visible:rotate-0');
  });
});

describe('content comes from data, not from the components', () => {
  it('the category filter rule is exhaustive and never widens the set', () => {
    expect(filterDeals('All')).toEqual(deals);
    for (const c of categories) {
      const got = filterDeals(c.name);
      expect(got.length).toBeLessThanOrEqual(deals.length);
      if (c.name !== 'All') {
        for (const d of got) expect(d.cat).toBe(c.name);
      }
    }
  });

  it('every craving carries a full spread', () => {
    expect(cravings.length).toBeGreaterThan(2);
    for (const c of cravings) {
      expect(c.results).toHaveLength(3);
      for (const r of c.results) {
        expect(r.area.length).toBeGreaterThan(0);
        expect(r.walk).toMatch(/^\d+ min$/);
      }
    }
  });
});
