/**
 * When is an event actually on?
 *
 * Two timestamps model a CONTINUOUS span, which is right for a gig and wrong
 * for most events. A three-day fiesta open 10:00–22:00 daily is not running at
 * 3am on day two, and a banner that says "Happening now" then is lying to
 * someone who might walk there.
 *
 * So an event is live when `now` is inside the span AND — if it declares one —
 * inside its daily window. The window is optional: both times null means the
 * event genuinely runs straight through.
 *
 * Pure and timezone-explicit, for the same two reasons `operatingHours.ts`
 * is: the server runs UTC and a visiting tourist's device could be anywhere,
 * so an event's hours are only meaningful in Asia/Manila. The zone constant
 * and the overnight rule are shared with that module rather than restated.
 */

import { BUSINESS_TIME_ZONE } from './operatingHours';

export { BUSINESS_TIME_ZONE };

/**
 * - `upcoming` — has not started
 * - `live` — on right now
 * - `between` — inside the run, but closed until its next daily opening
 * - `past` — over
 * - `unknown` — the row's dates are unusable; render no badge rather than a
 *   wrong one (same contract as `isOpenNow` returning null)
 */
export type EventPhase = 'upcoming' | 'live' | 'between' | 'past' | 'unknown';

/** The scheduling fields, so callers can pass a row or a partial. */
export interface EventSchedule {
  starts_at: string | null | undefined;
  ends_at: string | null | undefined;
  daily_start_time?: string | null;
  daily_end_time?: string | null;
}

/** Minutes since midnight from `HH:mm` or `HH:mm:ss`, else null. */
function toMinutes(value: string | null | undefined): number | null {
  if (typeof value !== 'string') return null;
  const match = /^(\d{1,2}):(\d{2})(?::\d{2})?$/.exec(value.trim());
  if (!match) return null;

  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours > 23 || minutes > 59) return null;

  return hours * 60 + minutes;
}

function toDate(value: string | null | undefined): Date | null {
  if (typeof value !== 'string' || !value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

/** Minutes since midnight of an instant, in Manila. */
function manilaMinutesOfDay(instant: Date): number | null {
  try {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: BUSINESS_TIME_ZONE,
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).formatToParts(instant);

    const get = (type: string) =>
      parts.find((part) => part.type === type)?.value ?? '';

    // `hour12: false` yields "24" at midnight in some ICU versions.
    const hour = Number(get('hour')) % 24;
    const minute = Number(get('minute'));
    if (!Number.isFinite(hour) || !Number.isFinite(minute)) return null;

    return hour * 60 + minute;
  } catch {
    return null;
  }
}

/**
 * Is `now` inside the daily window? Handles the overnight case, where a
 * `daily_end_time` at or before `daily_start_time` closes the NEXT day —
 * the same rule `isOpenNow` applies to shop hours.
 */
function withinDailyWindow(
  minutesNow: number,
  open: number,
  close: number,
): boolean {
  if (close > open) return minutesNow >= open && minutesNow < close;

  // Overnight: open in the evening OR still open in the small hours.
  return minutesNow >= open || minutesNow < close;
}

/**
 * Where an event sits relative to `now`.
 *
 * The span always wins at the edges: on the last day the event ends at
 * `ends_at`, even if its daily window would run later. A night market whose
 * final session is cut short is over when the organiser said it was over.
 */
export function eventPhase(
  schedule: EventSchedule,
  now: Date = new Date(),
): EventPhase {
  const starts = toDate(schedule.starts_at);
  const ends = toDate(schedule.ends_at);
  if (!starts || !ends || ends <= starts) return 'unknown';

  if (now < starts) return 'upcoming';
  if (now >= ends) return 'past';

  const open = toMinutes(schedule.daily_start_time);
  const close = toMinutes(schedule.daily_end_time);

  // Both absent (or only one present, which the DB forbids but a hand-written
  // row could still carry) means the event runs continuously.
  if (open === null || close === null) return 'live';

  const minutesNow = manilaMinutesOfDay(now);
  // No usable local time — say "live" rather than hiding an event that is
  // inside its own span. Failing open is the lesser error here.
  if (minutesNow === null) return 'live';

  return withinDailyWindow(minutesNow, open, close) ? 'live' : 'between';
}

/** Convenience for the banner's badge. */
export function isEventLive(
  schedule: EventSchedule,
  now: Date = new Date(),
): boolean {
  return eventPhase(schedule, now) === 'live';
}

/**
 * Banner order: what is on right now comes first, then everything else by
 * start time, `priority` breaking ties, then id so the order is stable across
 * renders.
 *
 * The happening-now exception is deliberate and is the one place chronology is
 * broken: someone opening the app on a Saturday afternoon wants what is on,
 * not what is next.
 */
export function compareForBanner<
  T extends EventSchedule & { priority?: number; id?: string },
>(a: T, b: T, now: Date = new Date()): number {
  const aLive = isEventLive(a, now) ? 0 : 1;
  const bLive = isEventLive(b, now) ? 0 : 1;
  if (aLive !== bLive) return aLive - bLive;

  const aStart = toDate(a.starts_at)?.getTime() ?? Number.MAX_SAFE_INTEGER;
  const bStart = toDate(b.starts_at)?.getTime() ?? Number.MAX_SAFE_INTEGER;
  if (aStart !== bStart) return aStart - bStart;

  const byPriority = (b.priority ?? 0) - (a.priority ?? 0);
  if (byPriority !== 0) return byPriority;

  return (a.id ?? '').localeCompare(b.id ?? '');
}

/**
 * Manila's UTC offset, fixed.
 *
 * The Philippines has not observed daylight saving since 1978 and sits at
 * +08:00 year-round, so a literal offset is exact here — and it has to be a
 * literal, because a `datetime-local` input value carries NO zone at all.
 * Handing that string to `new Date()` interprets it in the DEVICE's zone, so
 * an owner filing "18:00" from abroad would schedule their event for 18:00
 * somewhere else entirely.
 */
const MANILA_OFFSET = '+08:00';

/**
 * `datetime-local` value ("2026-08-07T18:00") → an instant, read as Manila.
 * Returns null for an empty or unparseable field.
 */
export function manilaInputToIso(
  value: string | null | undefined,
): string | null {
  if (typeof value !== 'string' || !value.trim()) return null;
  // The input omits seconds when they are zero.
  const withSeconds = value.length === 16 ? `${value}:00` : value;
  const parsed = new Date(`${withSeconds}${MANILA_OFFSET}`);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

/**
 * An instant → the `datetime-local` value that shows it as Manila wall-clock
 * time. The inverse of `manilaInputToIso`, so editing an event round-trips to
 * the same reading the owner originally typed.
 */
export function isoToManilaInput(value: string | null | undefined): string {
  const instant = toDate(value);
  if (!instant) return '';

  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: BUSINESS_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(instant);

  const get = (type: string) =>
    parts.find((part) => part.type === type)?.value ?? '';
  const hour = String(Number(get('hour')) % 24).padStart(2, '0');

  return `${get('year')}-${get('month')}-${get('day')}T${hour}:${get('minute')}`;
}

/** Postgres `time` ("18:00:00") → the `<input type="time">` value. */
export function timeToInput(value: string | null | undefined): string {
  if (typeof value !== 'string') return '';
  const match = /^(\d{2}:\d{2})/.exec(value.trim());
  return match ? match[1] : '';
}

const DATE_FMT: Intl.DateTimeFormatOptions = {
  timeZone: BUSINESS_TIME_ZONE,
  day: 'numeric',
  month: 'short',
};

const TIME_FMT: Intl.DateTimeFormatOptions = {
  timeZone: BUSINESS_TIME_ZONE,
  hour: 'numeric',
  minute: '2-digit',
  hour12: true,
};

function manilaDayKey(instant: Date): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: BUSINESS_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(instant);
}

function formatClockMinutes(minutes: number): string {
  const hour24 = Math.floor(minutes / 60) % 24;
  const mins = minutes % 60;
  const suffix = hour24 < 12 ? 'AM' : 'PM';
  const hour12 = hour24 % 12 === 0 ? 12 : hour24 % 12;
  return `${hour12}:${String(mins).padStart(2, '0')} ${suffix}`;
}

/**
 * One line stating when the event is on, always with the TIME — "Sat 9 Aug"
 * alone leaves someone standing outside a closed venue.
 *
 * Single day:  `Sat 9 Aug · 6:00 PM – 11:00 PM`
 * Multi-day:   `Fri 8 – Sun 10 Aug · 10:00 AM – 10:00 PM daily`
 * Continuous:  `Fri 8 Aug 10:00 AM – Sun 10 Aug 10:00 PM`
 */
export function formatEventWhen(schedule: EventSchedule): string {
  const starts = toDate(schedule.starts_at);
  const ends = toDate(schedule.ends_at);
  if (!starts || !ends) return '';

  const weekday = (d: Date) =>
    new Intl.DateTimeFormat('en-GB', {
      timeZone: BUSINESS_TIME_ZONE,
      weekday: 'short',
    }).format(d);
  // en-GB for dates ("9 Aug", day first), en-US for times — en-GB renders
  // lowercase "am/pm", and `formatClock` in operatingHours.ts already sets the
  // house style as "6:00 PM".
  const date = (d: Date) =>
    new Intl.DateTimeFormat('en-GB', DATE_FMT).format(d);
  const time = (d: Date) =>
    new Intl.DateTimeFormat('en-US', TIME_FMT).format(d);

  const sameDay = manilaDayKey(starts) === manilaDayKey(ends);
  const open = toMinutes(schedule.daily_start_time);
  const close = toMinutes(schedule.daily_end_time);
  const hasWindow = open !== null && close !== null;

  if (sameDay) {
    return `${weekday(starts)} ${date(starts)} · ${time(starts)} – ${time(ends)}`;
  }

  const span = `${weekday(starts)} ${date(starts)} – ${weekday(ends)} ${date(ends)}`;

  if (hasWindow) {
    return `${span} · ${formatClockMinutes(open)} – ${formatClockMinutes(close)} daily`;
  }

  return `${weekday(starts)} ${date(starts)} ${time(starts)} – ${weekday(ends)} ${date(ends)} ${time(ends)}`;
}
