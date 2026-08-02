// @vitest-environment happy-dom

/**
 * The public events surfaces.
 *
 * What matters here is what a visitor is TOLD. Three claims:
 *
 * 1. An outage is not "nothing is on" — this repo has had to fix that
 *    conflation on three separate surfaces.
 * 2. A finished event stays readable and says so, rather than 404ing on
 *    someone who clicked a shared link the morning after.
 * 3. A stored link is never rendered raw. Zod guards the write path; rows
 *    written before it, and admin edits, bypass Zod entirely.
 */

import { describe, it, expect, vi } from 'vitest';
import * as React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { EventCard } from '../event-card';
import { EventsBrowser } from '../events-browser';
import type { EventWithRefs } from '@/lib/types';

vi.mock('next/link', () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) =>
    React.createElement('a', { href }, children),
}));

vi.mock('next/image', () => ({
  default: (props: Record<string, unknown>) =>
    React.createElement('img', {
      src: String(props.src),
      alt: String(props.alt ?? ''),
    }),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: vi.fn(), push: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));

function makeEvent(overrides: Partial<EventWithRefs> = {}): EventWithRefs {
  return {
    id: 'evt-1',
    business_id: null,
    product_id: null,
    name: 'Dinagyang street party',
    description: null,
    address: 'Iznart St, Iloilo City',
    image_url: null,
    starts_at: '2036-08-20T02:00:00.000Z',
    ends_at: '2036-08-20T10:00:00.000Z',
    daily_start_time: null,
    daily_end_time: null,
    link_url: null,
    ticket_url: null,
    status: 'approved',
    review_note: null,
    reviewed_by: null,
    reviewed_at: null,
    priority: 0,
    created_at: '2026-08-01T00:00:00.000Z',
    updated_at: '2026-08-01T00:00:00.000Z',
    archived_at: null,
    business: null,
    product: null,
    ...overrides,
  };
}

const METADATA = { total: 0, page: 1, per_page: 12, total_pages: 0 };

function browser(props: Partial<Parameters<typeof EventsBrowser>[0]> = {}) {
  return renderToStaticMarkup(
    React.createElement(EventsBrowser, {
      events: [],
      metadata: METADATA,
      loadFailed: false,
      when: 'upcoming',
      ...props,
    }),
  );
}

describe('an outage is not an empty listing', () => {
  it('says the load failed, not that nothing is on', () => {
    const html = browser({ loadFailed: true });

    // Apostrophes arrive HTML-escaped in the server render, so match on the
    // part of the sentence that carries the meaning.
    expect(html).toContain('load what');
    expect(html).not.toContain('Nothing on right now');
  });

  it('says nothing is on when the read genuinely returned nothing', () => {
    const html = browser({ loadFailed: false });

    expect(html).toContain('Nothing on right now');
    expect(html).not.toContain('load what');
  });

  it('offers different copy for an empty past filter', () => {
    expect(browser({ when: 'past' })).toContain('Nothing finished yet');
  });
});

describe('the grid renders complete in the server HTML', () => {
  it('lists an event with its name, date, time and venue', () => {
    const html = browser({
      events: [makeEvent({ name: 'Kasadyahan parade' })],
      metadata: { ...METADATA, total: 1, total_pages: 1 },
    });

    expect(html).toContain('Kasadyahan parade');
    expect(html).toContain('Iznart St, Iloilo City');
    // 02:00Z is 10:00 in Manila — the date alone would leave someone standing
    // outside a closed venue.
    expect(html).toContain('10:00 AM');
    // Nothing hidden behind hydration.
    expect(html).not.toContain('opacity:0');
  });

  it('links each card to its own page', () => {
    const html = browser({
      events: [makeEvent({ id: 'abc-123' })],
      metadata: { ...METADATA, total: 1, total_pages: 1 },
    });
    expect(html).toContain('href="/events/abc-123"');
  });
});

describe('a finished event still reads as an event', () => {
  it('badges it Finished rather than hiding it', () => {
    const html = renderToStaticMarkup(
      React.createElement(EventCard, {
        event: makeEvent({
          starts_at: '2020-01-01T02:00:00.000Z',
          ends_at: '2020-01-01T10:00:00.000Z',
        }),
      }),
    );

    expect(html).toContain('Finished');
    expect(html).toContain('Dinagyang street party');
  });

  it('does not badge an upcoming event as finished', () => {
    const html = renderToStaticMarkup(
      React.createElement(EventCard, { event: makeEvent() }),
    );
    expect(html).not.toContain('Finished');
  });
});
