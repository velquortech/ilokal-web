// @vitest-environment happy-dom

/**
 * The events banner carousel.
 *
 * Two claims this repo has been burnt by before, so both are asserted against
 * the SERVER render:
 *
 * 1. Nothing is invisible without JS. The landing shipped a blank page once
 *    because `initial` styles were written into the server HTML.
 * 2. Zero events renders NOTHING. An empty carousel is worse than no carousel.
 *
 * Plus the ordering rule: what is on right now leads, ahead of chronology.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';
import { EventBanner } from '../event-banner';
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

function makeEvent(overrides: Partial<EventWithRefs>): EventWithRefs {
  return {
    id: 'evt-1',
    business_id: null,
    product_id: null,
    name: 'Dinagyang street party',
    description: null,
    address: 'Iznart St, Iloilo City',
    image_url: null,
    starts_at: '2026-08-20T02:00:00.000Z',
    ends_at: '2026-08-20T10:00:00.000Z',
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

describe('server render', () => {
  it('renders nothing at all when there are no events', () => {
    const html = renderToStaticMarkup(
      React.createElement(EventBanner, { events: [] }),
    );
    expect(html).toBe('');
  });

  it('ships the event visible, not hidden behind hydration', () => {
    const html = renderToStaticMarkup(
      React.createElement(EventBanner, {
        events: [makeEvent({ name: 'Kasadyahan parade' })],
      }),
    );

    expect(html).toContain('Kasadyahan parade');
    expect(html).toContain('Iznart St, Iloilo City');
    // The landing shipped `style="opacity:0"` into the server HTML once and
    // rendered blank without JS. Never again.
    expect(html).not.toContain('opacity:0');
    expect(html).not.toContain('opacity: 0');
  });

  it('names the date AND the time, so nobody turns up to a closed venue', () => {
    const html = renderToStaticMarkup(
      React.createElement(EventBanner, { events: [makeEvent({})] }),
    );
    // 2026-08-20T02:00Z is 10:00 in Manila.
    expect(html).toContain('10:00 AM');
    expect(html).toContain('20 Aug');
  });

  it('keeps the track scrollable in its own container', () => {
    const html = renderToStaticMarkup(
      React.createElement(EventBanner, { events: [makeEvent({})] }),
    );
    // The page body must never scroll sideways.
    expect(html).toContain('overflow-x-auto');
  });

  it('gives each slide the full track width', () => {
    const html = renderToStaticMarkup(
      React.createElement(EventBanner, {
        events: [makeEvent({ id: 'a' }), makeEvent({ id: 'b' })],
      }),
    );
    // `w-full shrink-0` is what makes this a carousel rather than a strip of
    // partially-visible cards.
    expect(html).toContain('w-full shrink-0 snap-start');
  });

  it('announces itself as a carousel with numbered slides', () => {
    const html = renderToStaticMarkup(
      React.createElement(EventBanner, {
        events: [makeEvent({ id: 'a' }), makeEvent({ id: 'b' })],
      }),
    );
    expect(html).toContain('aria-roledescription="carousel"');
    expect(html).toContain('aria-label="1 of 2"');
    expect(html).toContain('aria-label="2 of 2"');
  });

  it('gives every dot a real label, not a bare span', () => {
    const html = renderToStaticMarkup(
      React.createElement(EventBanner, {
        events: [
          makeEvent({ id: 'a', name: 'Alpha' }),
          makeEvent({ id: 'b', name: 'Beta' }),
        ],
      }),
    );
    expect(html).toContain('aria-label="Go to Alpha"');
    expect(html).toContain('aria-label="Go to Beta"');
  });

  it('gives the arrows real labels', () => {
    const html = renderToStaticMarkup(
      React.createElement(EventBanner, {
        events: [makeEvent({ id: 'a' }), makeEvent({ id: 'b' })],
      }),
    );
    expect(html).toContain('aria-label="Previous event"');
    expect(html).toContain('aria-label="Next event"');
  });

  it('hides the arrows when there is nowhere to scroll', () => {
    const html = renderToStaticMarkup(
      React.createElement(EventBanner, { events: [makeEvent({})] }),
    );
    expect(html).not.toContain('aria-label="Next event"');
  });
});

describe('ordering after mount', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    vi.useFakeTimers();
    // Sat 8 Aug 2026, 14:00 Manila.
    vi.setSystemTime(new Date('2026-08-08T06:00:00.000Z'));
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    vi.useRealTimers();
  });

  const liveNow = makeEvent({
    id: 'live',
    name: 'Night market',
    starts_at: '2026-08-07T02:00:00.000Z',
    ends_at: '2026-08-09T14:00:00.000Z',
    daily_start_time: '10:00:00',
    daily_end_time: '22:00:00',
  });
  const soon = makeEvent({
    id: 'soon',
    name: 'Next weekend',
    starts_at: '2026-08-15T02:00:00.000Z',
    ends_at: '2026-08-15T10:00:00.000Z',
  });

  function names(): string[] {
    return Array.from(container.querySelectorAll('li h3')).map(
      (node) => node.textContent ?? '',
    );
  }

  it('promotes what is on right now ahead of chronology', () => {
    // Server order is by start date, so the live one is second on arrival…
    act(() => {
      root.render(
        React.createElement(EventBanner, { events: [soon, liveNow] }),
      );
    });

    // …and leads once the client knows what time it is.
    expect(names()[0]).toBe('Night market');
    expect(container.textContent).toContain('Happening now');
  });

  it('does not promote an event that is mid-run but closed for the night', () => {
    // 03:00 Manila on day two — inside the span, outside the daily window.
    vi.setSystemTime(new Date('2026-08-07T19:00:00.000Z'));

    act(() => {
      root.render(
        React.createElement(EventBanner, { events: [soon, liveNow] }),
      );
    });

    expect(container.textContent).not.toContain('Happening now');
  });
});
