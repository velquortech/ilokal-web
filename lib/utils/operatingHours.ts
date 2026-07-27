/**
 * Operating-hours formatting and the "Open now" computation.
 *
 * Pure and timezone-explicit. Two traps this exists to avoid:
 *
 * 1. **Timezone.** The server runs UTC on Vercel and a visiting tourist's
 *    device could be anywhere. A shop's hours are local to the shop, so
 *    "open now" is only meaningful in Asia/Manila. Never use the ambient zone.
 * 2. **Overnight spans.** A bar open `22:00–02:00` closes on the NEXT day.
 *    A naive `open <= now && now < close` reports it closed all evening.
 *
 * Input is owner-supplied JSONB, so every field is treated as untrusted:
 * malformed times degrade to "no answer" rather than a wrong answer.
 */

import type { DayKey, OperatingHours, OperatingHoursDay } from '@/lib/types';

/** Shop-local zone. Hours mean nothing without it. */
export const BUSINESS_TIME_ZONE = 'Asia/Manila';

/** Display order — Monday first, matching the owner-side settings form. */
export const DAY_ORDER: readonly DayKey[] = [
  'mon',
  'tue',
  'wed',
  'thu',
  'fri',
  'sat',
  'sun',
] as const;

export const DAY_LABELS: Record<DayKey, string> = {
  mon: 'Monday',
  tue: 'Tuesday',
  wed: 'Wednesday',
  thu: 'Thursday',
  fri: 'Friday',
  sat: 'Saturday',
  sun: 'Sunday',
};

/** `Date.getDay()` is Sunday-indexed; map it to our keys. */
const WEEKDAY_INDEX_TO_KEY: readonly DayKey[] = [
  'sun',
  'mon',
  'tue',
  'wed',
  'thu',
  'fri',
  'sat',
] as const;

/** Minutes since midnight, or null if the value isn't a usable `HH:mm`. */
function toMinutes(value: string | null | undefined): number | null {
  if (typeof value !== 'string') return null;
  const match = /^(\d{2}):(\d{2})$/.exec(value.trim());
  if (!match) return null;

  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours > 23 || minutes > 59) return null;

  return hours * 60 + minutes;
}

function formatClock(value: string): string {
  const minutes = toMinutes(value);
  if (minutes === null) return value;

  const hour24 = Math.floor(minutes / 60);
  const mins = minutes % 60;
  const suffix = hour24 < 12 ? 'AM' : 'PM';
  const hour12 = hour24 % 12 === 0 ? 12 : hour24 % 12;

  return `${hour12}:${String(mins).padStart(2, '0')} ${suffix}`;
}

/** One rendered row. `hours` is null when the shop is closed or unusable. */
export type FormattedDay = {
  key: DayKey;
  label: string;
  hours: string | null;
};

export function formatOperatingHours(
  operatingHours: OperatingHours | null | undefined,
): FormattedDay[] {
  if (!operatingHours || typeof operatingHours !== 'object') return [];

  return DAY_ORDER.map((key) => {
    const day = operatingHours[key] as OperatingHoursDay | undefined;
    const open = toMinutes(day?.open);
    const close = toMinutes(day?.close);

    return {
      key,
      label: DAY_LABELS[key],
      hours:
        !day || day.closed || open === null || close === null
          ? null
          : `${formatClock(day.open)} – ${formatClock(day.close)}`,
    };
  });
}

/** True when at least one day has a usable range — i.e. worth rendering. */
export function hasOperatingHours(
  operatingHours: OperatingHours | null | undefined,
): boolean {
  return formatOperatingHours(operatingHours).some((day) => day.hours !== null);
}

/** Shop-local weekday + minutes-since-midnight for an instant. */
function shopLocalNow(now: Date): { key: DayKey; minutes: number } | null {
  try {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: BUSINESS_TIME_ZONE,
      weekday: 'short',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).formatToParts(now);

    const get = (type: string) =>
      parts.find((part) => part.type === type)?.value ?? '';

    const weekday = get('weekday').toLowerCase().slice(0, 3) as DayKey;
    if (!WEEKDAY_INDEX_TO_KEY.includes(weekday)) return null;

    // `hour12: false` can yield "24" at midnight in some ICU versions.
    const hour = Number(get('hour')) % 24;
    const minute = Number(get('minute'));
    if (!Number.isFinite(hour) || !Number.isFinite(minute)) return null;

    return { key: weekday, minutes: hour * 60 + minute };
  } catch {
    return null;
  }
}

function previousDay(key: DayKey): DayKey {
  const index = WEEKDAY_INDEX_TO_KEY.indexOf(key);
  return WEEKDAY_INDEX_TO_KEY[(index + 6) % 7];
}

/**
 * `true` open, `false` closed, `null` "can't say" (no usable hours) — the
 * caller renders no badge at all for null rather than guessing "Closed".
 */
export function isOpenNow(
  operatingHours: OperatingHours | null | undefined,
  now: Date = new Date(),
): boolean | null {
  if (!hasOperatingHours(operatingHours)) return null;

  const local = shopLocalNow(now);
  if (!local) return null;

  const withinDay = (key: DayKey, offsetMinutes: number): boolean => {
    const day = operatingHours?.[key] as OperatingHoursDay | undefined;
    if (!day || day.closed) return false;

    const open = toMinutes(day.open);
    const close = toMinutes(day.close);
    if (open === null || close === null) return false;

    // Overnight: the range runs past midnight into the following day.
    const end = close <= open ? close + 24 * 60 : close;
    const cursor = offsetMinutes;

    return cursor >= open && cursor < end;
  };

  // Today's own range, plus yesterday's range spilling past midnight.
  return (
    withinDay(local.key, local.minutes) ||
    withinDay(previousDay(local.key), local.minutes + 24 * 60)
  );
}
