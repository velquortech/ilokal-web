/**
 * Event scheduling.
 *
 * The claim under test: an event with a daily window is NOT running overnight.
 * A banner that badges a closed three-day fiesta as "Happening now" at 3am is
 * telling someone it is worth walking there, which is the failure this whole
 * column pair exists to prevent.
 *
 * Every instant here is written as an explicit UTC ISO string with its Manila
 * equivalent in the comment, because "8pm" means two different things on the
 * server (UTC) and at the venue (UTC+8) — and that gap is the bug, not a
 * detail of the test.
 */

import { describe, it, expect } from 'vitest';
import {
  eventPhase,
  isEventLive,
  compareForBanner,
  formatEventWhen,
  manilaInputToIso,
  isoToManilaInput,
  timeToInput,
  BUSINESS_TIME_ZONE,
} from '../eventSchedule';

// A three-day run, 10:00–22:00 Manila each day.
const FIESTA = {
  starts_at: '2026-08-07T02:00:00Z', // Fri 7 Aug 10:00 Manila
  ends_at: '2026-08-09T14:00:00Z', //  Sun 9 Aug 22:00 Manila
  daily_start_time: '10:00:00',
  daily_end_time: '22:00:00',
};

// Same span, no daily window: runs straight through.
const MARATHON = {
  starts_at: '2026-08-07T02:00:00Z',
  ends_at: '2026-08-09T14:00:00Z',
  daily_start_time: null,
  daily_end_time: null,
};

const at = (iso: string) => new Date(iso);

describe('the timezone is pinned', () => {
  it('is Asia/Manila, shared with operatingHours', () => {
    expect(BUSINESS_TIME_ZONE).toBe('Asia/Manila');
  });
});

describe('eventPhase — the span', () => {
  it('is upcoming before it starts', () => {
    expect(eventPhase(FIESTA, at('2026-08-06T00:00:00Z'))).toBe('upcoming');
  });

  it('is past after it ends', () => {
    expect(eventPhase(FIESTA, at('2026-08-10T00:00:00Z'))).toBe('past');
  });

  it('reports unknown rather than guessing when the dates are unusable', () => {
    expect(eventPhase({ starts_at: null, ends_at: null })).toBe('unknown');
    expect(eventPhase({ starts_at: 'nonsense', ends_at: 'nonsense' })).toBe(
      'unknown',
    );
    // Inverted — the DB rejects this, but a hand-written row could carry it.
    expect(
      eventPhase({
        starts_at: '2026-08-09T00:00:00Z',
        ends_at: '2026-08-07T00:00:00Z',
      }),
    ).toBe('unknown');
  });
});

describe('eventPhase — the daily window', () => {
  it('is live inside the daily hours', () => {
    // Sat 8 Aug 14:00 Manila — day two, mid-afternoon.
    expect(eventPhase(FIESTA, at('2026-08-08T06:00:00Z'))).toBe('live');
  });

  it('is BETWEEN mid-run but outside the daily hours', () => {
    // Sat 8 Aug 03:00 Manila — day two, the middle of the night. This is the
    // case two bare timestamps get wrong.
    expect(eventPhase(FIESTA, at('2026-08-07T19:00:00Z'))).toBe('between');
    expect(isEventLive(FIESTA, at('2026-08-07T19:00:00Z'))).toBe(false);
  });

  it('runs continuously when no window is declared', () => {
    // Same 3am instant, no daily window: genuinely still running.
    expect(eventPhase(MARATHON, at('2026-08-07T19:00:00Z'))).toBe('live');
  });

  it('is live at the opening minute and closed at the closing minute', () => {
    // Sat 8 Aug 10:00 Manila exactly.
    expect(eventPhase(FIESTA, at('2026-08-08T02:00:00Z'))).toBe('live');
    // Sat 8 Aug 22:00 Manila exactly — the window is half-open.
    expect(eventPhase(FIESTA, at('2026-08-08T14:00:00Z'))).toBe('between');
  });

  it('treats a half-declared window as continuous rather than erroring', () => {
    // The DB forbids this pairing, but a hand-written row could still carry it.
    expect(
      eventPhase(
        { ...FIESTA, daily_end_time: null },
        at('2026-08-07T19:00:00Z'),
      ),
    ).toBe('live');
  });
});

describe('eventPhase — the overnight window', () => {
  // A night market: 18:00 to 02:00 the next morning.
  const NIGHT_MARKET = {
    starts_at: '2026-08-07T10:00:00Z', // Fri 8 Aug 18:00 Manila
    ends_at: '2026-08-10T18:00:00Z', //  Tue 11 Aug 02:00 Manila
    daily_start_time: '18:00:00',
    daily_end_time: '02:00:00',
  };

  it('is live in the evening', () => {
    // Sat 9 Aug 20:00 Manila.
    expect(eventPhase(NIGHT_MARKET, at('2026-08-09T12:00:00Z'))).toBe('live');
  });

  it('is still live after midnight', () => {
    // Sun 10 Aug 01:00 Manila — this is what a naive open<=now<close breaks on.
    expect(eventPhase(NIGHT_MARKET, at('2026-08-09T17:00:00Z'))).toBe('live');
  });

  it('is closed in the afternoon', () => {
    // Sun 10 Aug 14:00 Manila.
    expect(eventPhase(NIGHT_MARKET, at('2026-08-10T06:00:00Z'))).toBe(
      'between',
    );
  });
});

describe('eventPhase — the span caps the last day', () => {
  it('is past once ends_at has gone, even inside the daily window', () => {
    const CUT_SHORT = {
      starts_at: '2026-08-07T02:00:00Z', // Fri 10:00 Manila
      ends_at: '2026-08-09T06:00:00Z', //  Sun 14:00 Manila — early finish
      daily_start_time: '10:00:00',
      daily_end_time: '22:00:00',
    };
    // Sun 10 Aug 18:00 Manila: inside the daily hours, but the organiser said
    // it was over at 14:00.
    expect(eventPhase(CUT_SHORT, at('2026-08-09T10:00:00Z'))).toBe('past');
  });
});

describe('UTC vs Manila boundary', () => {
  it('answers in Manila, not the server zone', () => {
    // 2026-08-08T17:00:00Z is Sat 9 Aug 01:00 in Manila but still FRIDAY
    // 17:00 in UTC. Reading the hour in UTC would call this "live" (17:00 is
    // inside 10:00-22:00); in Manila it is 1am and the event is shut.
    expect(eventPhase(FIESTA, at('2026-08-08T17:00:00Z'))).toBe('between');
  });
});

describe('compareForBanner', () => {
  const live = { ...FIESTA, id: 'live', priority: 0 };
  const soon = {
    id: 'soon',
    priority: 0,
    starts_at: '2026-08-20T02:00:00Z',
    ends_at: '2026-08-20T10:00:00Z',
    daily_start_time: null,
    daily_end_time: null,
  };
  const later = {
    id: 'later',
    priority: 0,
    starts_at: '2026-09-01T02:00:00Z',
    ends_at: '2026-09-01T10:00:00Z',
    daily_start_time: null,
    daily_end_time: null,
  };
  // Sat 9 Aug 14:00 Manila — the fiesta is open.
  const now = at('2026-08-09T06:00:00Z');

  it('puts what is on right now first, ahead of chronology', () => {
    const sorted = [later, soon, live].sort((a, b) =>
      compareForBanner(a, b, now),
    );
    expect(sorted.map((e) => e.id)).toEqual(['live', 'soon', 'later']);
  });

  it('does NOT promote an event that is mid-run but closed', () => {
    // 3am: the fiesta is `between`, so it sorts by its start date like
    // anything else — and its start is in the past, so it still leads here.
    const night = at('2026-08-08T19:00:00Z');
    const sorted = [later, soon, live].sort((a, b) =>
      compareForBanner(a, b, night),
    );
    // Ordering is by start time now, not by a live badge.
    expect(sorted.map((e) => e.id)).toEqual(['live', 'soon', 'later']);
    expect(isEventLive(live, night)).toBe(false);
  });

  it('ranks by priority before start time, then id, so the order is stable', () => {
    const a = { ...soon, id: 'aaa', priority: 1 };
    const b = { ...soon, id: 'bbb', priority: 9 };
    const c = { ...soon, id: 'ccc', priority: 9 };
    const sorted = [a, c, b].sort((x, y) => compareForBanner(x, y, now));
    expect(sorted.map((e) => e.id)).toEqual(['bbb', 'ccc', 'aaa']);
  });

  it('lets priority outrank an earlier start date', () => {
    // The regression this pins: `priority` used to sit BELOW `starts_at`, so
    // it only separated two byte-identical timestamps. The admin's "Banner
    // order" control promised "higher shows first among events starting the
    // same day" and delivered almost nothing.
    const featured = { ...later, id: 'featured', priority: 9 };
    const sorted = [soon, featured].sort((x, y) => compareForBanner(x, y, now));
    expect(sorted.map((e) => e.id)).toEqual(['featured', 'soon']);
  });

  it('agrees with the order getBannerEvents already applied', () => {
    // This comparator re-ranks AFTER mount on top of the query's
    // `priority DESC, starts_at ASC, id`. If the two disagree, hydration
    // visibly reshuffles the strip — which is what shipped.
    const rows = [
      { ...soon, id: 'p9-late', priority: 9 },
      { ...later, id: 'p9-later', priority: 9 },
      { ...soon, id: 'p0-soon', priority: 0 },
    ];
    const fromQuery = [...rows].sort(
      (x, y) =>
        y.priority - x.priority ||
        Date.parse(x.starts_at) - Date.parse(y.starts_at) ||
        x.id.localeCompare(y.id),
    );
    const fromClient = [...rows].sort((x, y) => compareForBanner(x, y, now));

    // No event here is live, so the one deliberate divergence cannot apply.
    expect(fromClient.map((e) => e.id)).toEqual(fromQuery.map((e) => e.id));
  });
});

describe('formatEventWhen', () => {
  it('states the time, not only the day, for a single-day event', () => {
    const out = formatEventWhen({
      starts_at: '2026-08-09T10:00:00Z', // Sun 9 Aug 18:00 Manila
      ends_at: '2026-08-09T15:00:00Z', //  Sun 9 Aug 23:00 Manila
      daily_start_time: null,
      daily_end_time: null,
    });
    expect(out).toContain('6:00 PM');
    expect(out).toContain('11:00 PM');
    expect(out).toContain('9 Aug');
  });

  it('says "daily" for a multi-day run with a window', () => {
    const out = formatEventWhen(FIESTA);
    expect(out).toContain('daily');
    expect(out).toContain('10:00 AM');
    expect(out).toContain('10:00 PM');
  });

  it('spells out both ends for a continuous multi-day run', () => {
    const out = formatEventWhen(MARATHON);
    expect(out).not.toContain('daily');
    expect(out).toContain('7 Aug');
    expect(out).toContain('9 Aug');
  });

  it('returns empty rather than "Invalid Date" for an unusable row', () => {
    expect(formatEventWhen({ starts_at: null, ends_at: null })).toBe('');
  });
});

describe('form values round-trip through Manila', () => {
  it('reads a datetime-local value as Manila, not as the device zone', () => {
    // An owner types 18:00 for a Manila event. That string carries NO zone —
    // handing it to `new Date()` would interpret it wherever the owner
    // happens to be sitting, so someone filing from Sydney would schedule
    // 18:00 AEST, three hours early.
    expect(manilaInputToIso('2026-08-07T18:00')).toBe(
      '2026-08-07T10:00:00.000Z',
    );
  });

  it('accepts a value that carries seconds', () => {
    expect(manilaInputToIso('2026-08-07T18:00:00')).toBe(
      '2026-08-07T10:00:00.000Z',
    );
  });

  it('returns null for an empty or unusable field', () => {
    expect(manilaInputToIso('')).toBeNull();
    expect(manilaInputToIso(null)).toBeNull();
    expect(manilaInputToIso('not a date')).toBeNull();
  });

  it('renders an instant back as the Manila wall-clock reading', () => {
    expect(isoToManilaInput('2026-08-07T10:00:00.000Z')).toBe(
      '2026-08-07T18:00',
    );
  });

  it('round-trips, so editing shows what the owner typed', () => {
    const typed = '2026-12-31T23:30';
    const stored = manilaInputToIso(typed);
    expect(stored).not.toBeNull();
    // Crosses midnight AND the year boundary in UTC — 2026-12-31 15:30Z.
    expect(stored).toBe('2026-12-31T15:30:00.000Z');
    expect(isoToManilaInput(stored)).toBe(typed);
  });

  it('renders midnight as 00:00, not 24:00', () => {
    // Some ICU versions yield "24" for midnight under hour12:false.
    expect(isoToManilaInput('2026-08-06T16:00:00.000Z')).toBe(
      '2026-08-07T00:00',
    );
  });

  it('returns empty for an unusable instant rather than "Invalid Date"', () => {
    expect(isoToManilaInput(null)).toBe('');
    expect(isoToManilaInput('nonsense')).toBe('');
  });

  it('trims a Postgres time to the input shape', () => {
    expect(timeToInput('18:00:00')).toBe('18:00');
    expect(timeToInput('18:00')).toBe('18:00');
    expect(timeToInput(null)).toBe('');
    expect(timeToInput('nonsense')).toBe('');
  });
});
