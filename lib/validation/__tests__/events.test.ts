/**
 * Event validation.
 *
 * The URL cases are the point of this file. Zod's `z.url()` is backed by
 * `new URL()`, which accepts `javascript:alert(1)` — this repo already shipped
 * that once in `urlOrEmpty`, inert only because nothing rendered the column.
 * Event links ARE rendered as hrefs, so every scheme trick that got past the
 * old check is pinned here.
 */

import { describe, it, expect } from 'vitest';
import {
  createEventSchema,
  updateEventSchema,
  eventDecisionSchema,
  eventFiltersSchema,
  nearbyEventsSchema,
  eventStatusSchema,
} from '../events';
import { EVENT_STATUSES } from '@/lib/types/event';

const VALID = {
  name: 'Dinagyang street party',
  address: 'Iznart St, Iloilo City',
  starts_at: '2026-08-07T02:00:00.000Z',
  ends_at: '2026-08-09T14:00:00.000Z',
};

describe('status enum mirrors the DB CHECK', () => {
  it('matches the runtime constant', () => {
    expect([...eventStatusSchema.options].sort()).toEqual(
      [...EVENT_STATUSES].sort(),
    );
  });
});

describe('links — the scheme allowlist', () => {
  const DANGEROUS = [
    'javascript:alert(1)',
    'JavaScript:alert(1)',
    'data:text/html,<script>alert(1)</script>',
    'vbscript:msgbox(1)',
    // The WHATWG parser strips tab/CR/LF before parsing, so a blocklist on the
    // raw string misses these entirely.
    'java\tscript:alert(1)',
    'java\nscript:alert(1)',
    'java\rscript:alert(1)',
    // No scheme of its own — inherits the page's and navigates off-site.
    '//evil.example.com',
    // Parses, but links nowhere.
    'http://',
    'not a url at all',
    'facebook.com/shop',
  ];

  it.each(DANGEROUS)('rejects %j as link_url', (bad) => {
    const result = createEventSchema.safeParse({ ...VALID, link_url: bad });
    expect(result.success).toBe(false);
  });

  it.each(DANGEROUS)('rejects %j as ticket_url', (bad) => {
    const result = createEventSchema.safeParse({ ...VALID, ticket_url: bad });
    expect(result.success).toBe(false);
  });

  it('accepts a real https link', () => {
    const result = createEventSchema.safeParse({
      ...VALID,
      link_url: 'https://dinagyang.example.ph/2026',
      ticket_url: 'https://tickets.example.ph/dinagyang',
    });
    expect(result.success).toBe(true);
  });

  it('treats an empty field as not set, so clearing a link works', () => {
    const result = createEventSchema.safeParse({ ...VALID, link_url: '' });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.link_url).toBeNull();
  });
});

describe('dates', () => {
  it('requires the end to come after the start', () => {
    const result = createEventSchema.safeParse({
      ...VALID,
      starts_at: '2026-08-09T14:00:00.000Z',
      ends_at: '2026-08-07T02:00:00.000Z',
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].path).toContain('ends_at');
    }
  });

  it('rejects an end equal to the start', () => {
    const result = createEventSchema.safeParse({
      ...VALID,
      ends_at: VALID.starts_at,
    });
    expect(result.success).toBe(false);
  });

  it('requires an offset, so a zoneless local time cannot slip through', () => {
    const result = createEventSchema.safeParse({
      ...VALID,
      starts_at: '2026-08-07T10:00:00',
    });
    expect(result.success).toBe(false);
  });
});

describe('the daily window is a pair', () => {
  it('rejects a start with no end', () => {
    const result = createEventSchema.safeParse({
      ...VALID,
      daily_start_time: '10:00',
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].path).toContain('daily_end_time');
    }
  });

  it('rejects an end with no start', () => {
    const result = createEventSchema.safeParse({
      ...VALID,
      daily_end_time: '22:00',
    });
    expect(result.success).toBe(false);
  });

  it('accepts both, normalising HH:mm to the Postgres time shape', () => {
    const result = createEventSchema.safeParse({
      ...VALID,
      daily_start_time: '10:00',
      daily_end_time: '22:00',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.daily_start_time).toBe('10:00:00');
      expect(result.data.daily_end_time).toBe('22:00:00');
    }
  });

  it('accepts an overnight window — it closes the next morning', () => {
    const result = createEventSchema.safeParse({
      ...VALID,
      daily_start_time: '18:00',
      daily_end_time: '02:00',
    });
    expect(result.success).toBe(true);
  });

  it('rejects a malformed time', () => {
    for (const bad of ['25:00', '10:60', '10', 'morning', '1000']) {
      expect(
        createEventSchema.safeParse({
          ...VALID,
          daily_start_time: bad,
          daily_end_time: '22:00',
        }).success,
      ).toBe(false);
    }
  });
});

describe('coordinates are a pair', () => {
  it('rejects a latitude with no longitude', () => {
    const result = createEventSchema.safeParse({ ...VALID, latitude: 10.6973 });
    expect(result.success).toBe(false);
  });

  it('rejects an out-of-range value', () => {
    expect(
      createEventSchema.safeParse({ ...VALID, latitude: 91, longitude: 122 })
        .success,
    ).toBe(false);
    expect(
      createEventSchema.safeParse({ ...VALID, latitude: 10, longitude: 181 })
        .success,
    ).toBe(false);
  });

  it('accepts a real Iloilo pin', () => {
    const result = createEventSchema.safeParse({
      ...VALID,
      latitude: 10.6973,
      longitude: 122.5649,
    });
    expect(result.success).toBe(true);
  });
});

describe('text limits mirror the DB CHECKs', () => {
  it('rejects an empty name', () => {
    expect(createEventSchema.safeParse({ ...VALID, name: '   ' }).success).toBe(
      false,
    );
  });

  it('rejects a name past 120 characters', () => {
    expect(
      createEventSchema.safeParse({ ...VALID, name: 'a'.repeat(121) }).success,
    ).toBe(false);
  });

  it('rejects a description past 2000 characters', () => {
    expect(
      createEventSchema.safeParse({ ...VALID, description: 'a'.repeat(2001) })
        .success,
    ).toBe(false);
  });

  it('requires an address', () => {
    expect(createEventSchema.safeParse({ ...VALID, address: '' }).success).toBe(
      false,
    );
  });
});

describe('updateEventSchema', () => {
  it('accepts a single field', () => {
    expect(updateEventSchema.safeParse({ name: 'New name' }).success).toBe(
      true,
    );
  });

  it('still enforces the cross-field rules when both dates are present', () => {
    expect(
      updateEventSchema.safeParse({
        starts_at: '2026-08-09T14:00:00.000Z',
        ends_at: '2026-08-07T02:00:00.000Z',
      }).success,
    ).toBe(false);
  });

  it('does not invent an ordering rule from one date alone', () => {
    expect(
      updateEventSchema.safeParse({ ends_at: '2026-08-07T02:00:00.000Z' })
        .success,
    ).toBe(true);
  });
});

describe('eventDecisionSchema', () => {
  it('requires a note when rejecting', () => {
    const result = eventDecisionSchema.safeParse({ decision: 'reject' });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.issues[0].path).toContain('note');
  });

  it('rejects an empty note as no note', () => {
    expect(
      eventDecisionSchema.safeParse({ decision: 'reject', note: '   ' })
        .success,
    ).toBe(false);
  });

  it('accepts a rejection with a reason', () => {
    expect(
      eventDecisionSchema.safeParse({
        decision: 'reject',
        note: 'The venue address is incomplete.',
      }).success,
    ).toBe(true);
  });

  it('allows approving without a note', () => {
    expect(eventDecisionSchema.safeParse({ decision: 'approve' }).success).toBe(
      true,
    );
  });

  it('bounds priority so the banner cannot be gamed with a huge number', () => {
    expect(
      eventDecisionSchema.safeParse({ decision: 'approve', priority: 101 })
        .success,
    ).toBe(false);
    expect(
      eventDecisionSchema.safeParse({ decision: 'approve', priority: 5 })
        .success,
    ).toBe(true);
  });
});

describe('filters', () => {
  it('defaults to upcoming, page 1', () => {
    const result = eventFiltersSchema.parse({});
    expect(result.when).toBe('upcoming');
    expect(result.page).toBe(1);
  });

  it('caps per_page so a client cannot ask for the whole table', () => {
    expect(eventFiltersSchema.safeParse({ per_page: 500 }).success).toBe(false);
  });

  it('accepts an empty status as "any status"', () => {
    expect(eventFiltersSchema.safeParse({ status: '' }).success).toBe(true);
  });

  it('rejects a business_id that is not a guid', () => {
    expect(
      eventFiltersSchema.safeParse({ business_id: 'not-a-uuid' }).success,
    ).toBe(false);
  });
});

describe('nearby params', () => {
  it('bounds the radius', () => {
    expect(
      nearbyEventsSchema.safeParse({ lat: 10.7, lng: 122.6, radius: 1_000_000 })
        .success,
    ).toBe(false);
  });

  it('defaults the radius', () => {
    const result = nearbyEventsSchema.parse({ lat: 10.7, lng: 122.6 });
    expect(result.radius).toBe(20_000);
  });

  it('rejects coordinates off the globe', () => {
    expect(nearbyEventsSchema.safeParse({ lat: 100, lng: 0 }).success).toBe(
      false,
    );
  });
});
