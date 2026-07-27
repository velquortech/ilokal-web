import { describe, it, expect } from 'vitest';
import {
  formatOperatingHours,
  hasOperatingHours,
  isOpenNow,
  shopLocalDayKey,
} from '@/lib/utils/operatingHours';
import type { DayKey, OperatingHours } from '@/lib/types';

/** Build a full week, closed by default, with the given days opened. */
function week(
  overrides: Partial<Record<DayKey, { open: string; close: string }>>,
): OperatingHours {
  const days: DayKey[] = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
  return Object.fromEntries(
    days.map((day) => {
      const range = overrides[day];
      return [
        day,
        range
          ? { open: range.open, close: range.close, closed: false }
          : { open: '', close: '', closed: true },
      ];
    }),
  ) as OperatingHours;
}

/** An instant expressed in shop-local (Asia/Manila, UTC+8) wall time. */
function manila(iso: string): Date {
  return new Date(`${iso}+08:00`);
}

describe('formatOperatingHours', () => {
  it('returns all seven days, Monday first', () => {
    const rows = formatOperatingHours(
      week({ mon: { open: '09:00', close: '18:00' } }),
    );
    expect(rows).toHaveLength(7);
    expect(rows.map((r) => r.key)).toEqual([
      'mon',
      'tue',
      'wed',
      'thu',
      'fri',
      'sat',
      'sun',
    ]);
  });

  it('formats a range as 12-hour clock times', () => {
    const [monday] = formatOperatingHours(
      week({ mon: { open: '09:00', close: '18:30' } }),
    );
    expect(monday.hours).toBe('9:00 AM – 6:30 PM');
  });

  it('renders midnight and noon correctly, not "0:00" or "12 AM" at noon', () => {
    const [monday] = formatOperatingHours(
      week({ mon: { open: '00:00', close: '12:00' } }),
    );
    expect(monday.hours).toBe('12:00 AM – 12:00 PM');
  });

  it('marks closed days as null rather than an empty range', () => {
    const rows = formatOperatingHours(
      week({ mon: { open: '09:00', close: '18:00' } }),
    );
    expect(rows.find((r) => r.key === 'tue')?.hours).toBeNull();
  });

  it('treats malformed times as closed instead of printing junk', () => {
    const broken = {
      ...week({}),
      mon: { open: '25:00', close: '18:00', closed: false },
      tue: { open: 'nonsense', close: '18:00', closed: false },
      wed: { open: '09:00', close: '', closed: false },
    } as OperatingHours;

    const rows = formatOperatingHours(broken);
    expect(rows.find((r) => r.key === 'mon')?.hours).toBeNull();
    expect(rows.find((r) => r.key === 'tue')?.hours).toBeNull();
    expect(rows.find((r) => r.key === 'wed')?.hours).toBeNull();
  });

  it('survives null / missing day keys', () => {
    expect(formatOperatingHours(null)).toEqual([]);
    expect(formatOperatingHours(undefined)).toEqual([]);
    const partial = { mon: { open: '09:00', close: '18:00', closed: false } };
    expect(formatOperatingHours(partial as OperatingHours)).toHaveLength(7);
  });
});

describe('hasOperatingHours', () => {
  it('is false when every day is closed or unusable', () => {
    expect(hasOperatingHours(week({}))).toBe(false);
    expect(hasOperatingHours(null)).toBe(false);
  });

  it('is true when at least one day has a usable range', () => {
    expect(
      hasOperatingHours(week({ sat: { open: '10:00', close: '14:00' } })),
    ).toBe(true);
  });
});

describe('isOpenNow — plain ranges', () => {
  const hours = week({
    mon: { open: '09:00', close: '18:00' },
    tue: { open: '09:00', close: '18:00' },
  });

  it('is open inside the range', () => {
    // 2026-07-27 is a Monday.
    expect(isOpenNow(hours, manila('2026-07-27T12:00'))).toBe(true);
  });

  it('is closed before opening and after closing', () => {
    expect(isOpenNow(hours, manila('2026-07-27T08:59'))).toBe(false);
    expect(isOpenNow(hours, manila('2026-07-27T18:30'))).toBe(false);
  });

  it('treats the closing minute as closed and the opening minute as open', () => {
    expect(isOpenNow(hours, manila('2026-07-27T09:00'))).toBe(true);
    expect(isOpenNow(hours, manila('2026-07-27T18:00'))).toBe(false);
  });

  it('is closed on a day marked closed', () => {
    // Wednesday.
    expect(isOpenNow(hours, manila('2026-07-29T12:00'))).toBe(false);
  });
});

describe('isOpenNow — overnight ranges', () => {
  // A bar: Friday 22:00 through Saturday 02:00.
  const bar = week({ fri: { open: '22:00', close: '02:00' } });

  it('is open late on the opening night', () => {
    // Friday 2026-07-31, 23:30 local.
    expect(isOpenNow(bar, manila('2026-07-31T23:30'))).toBe(true);
  });

  it('is still open after midnight, on the following calendar day', () => {
    // This is the case a naive `open <= now < close` gets wrong.
    expect(isOpenNow(bar, manila('2026-08-01T01:00'))).toBe(true);
  });

  it('is closed after the spill-over ends', () => {
    expect(isOpenNow(bar, manila('2026-08-01T02:30'))).toBe(false);
  });

  it('is closed earlier on the opening day', () => {
    expect(isOpenNow(bar, manila('2026-07-31T15:00'))).toBe(false);
  });

  it('handles a Sunday→Monday spill across the week boundary', () => {
    const sundayBar = week({ sun: { open: '20:00', close: '01:00' } });
    // Monday 2026-08-03, 00:30 local — still Sunday's session.
    expect(isOpenNow(sundayBar, manila('2026-08-03T00:30'))).toBe(true);
  });
});

describe('shopLocalDayKey', () => {
  it('answers in shop-local time, not the server zone', () => {
    // 2026-07-27T22:00Z is already TUESDAY in Manila (+8) while still Monday
    // in UTC — `new Date().getDay()` would highlight the wrong row.
    expect(shopLocalDayKey(new Date('2026-07-27T22:00:00Z'))).toBe('tue');
    expect(shopLocalDayKey(new Date('2026-07-27T02:00:00Z'))).toBe('mon');
  });
});

describe('isOpenNow — timezone', () => {
  it('answers in shop-local time, not UTC', () => {
    const hours = week({ mon: { open: '09:00', close: '18:00' } });
    // 2026-07-27T02:00Z is 10:00 Monday in Manila — open.
    expect(isOpenNow(hours, new Date('2026-07-27T02:00:00Z'))).toBe(true);
    // 2026-07-27T22:00Z is 06:00 TUESDAY in Manila — before opening.
    expect(isOpenNow(hours, new Date('2026-07-27T22:00:00Z'))).toBe(false);
  });

  it('is null (no answer) when there are no usable hours', () => {
    // The caller renders no badge — "Closed" would be a claim we can't support.
    expect(isOpenNow(null)).toBeNull();
    expect(isOpenNow(week({}))).toBeNull();
  });
});
