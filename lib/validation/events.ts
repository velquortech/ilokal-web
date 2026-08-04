/**
 * Event validation.
 *
 * The URL rules are the security-critical part. Zod's `z.url()` is backed by
 * `new URL()`, which ACCEPTS `javascript:alert(1)` — this repo has already
 * shipped that once, inert only because nothing rendered the column. Event
 * links ARE rendered as hrefs, so the check is delegated to
 * `safeExternalUrl()`: one allowlist, shared with the render-side guard, so
 * the two can never disagree about what a safe link is.
 *
 * The DB carries the same rule as a CHECK, because PostgREST bypasses Zod
 * entirely.
 */

import { z } from 'zod';
import { safeExternalUrl } from '@/lib/utils/safeExternalUrl';
import { EVENT_STATUSES, EVENT_TIME_FILTERS } from '@/lib/types/event';

export const eventStatusSchema = z.enum(EVENT_STATUSES);
export const eventTimeFilterSchema = z.enum(EVENT_TIME_FILTERS);

/** `z.guid()`, never `z.uuid()` — Zod 4's is strict RFC-9562 and rejects our ids. */
export const eventIdSchema = z.guid();

/**
 * An optional external link. Empty string and null both mean "not set" (a
 * cleared form field arrives as ''), and anything present must survive the
 * same guard the renderer applies.
 */
const externalUrl = z
  .string()
  .trim()
  .max(2048, 'That link is too long')
  .transform((value) => (value === '' ? null : value))
  .nullish()
  .refine((value) => value == null || safeExternalUrl(value) !== null, {
    message: 'Enter a full web address starting with http:// or https://',
  });

/** `HH:mm` or `HH:mm:ss` — a Postgres `time` round-trips as the latter. */
const clockTime = z
  .string()
  .trim()
  .regex(/^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/, 'Use a time like 18:00')
  .transform((value) => (value.length === 5 ? `${value}:00` : value));

const isoInstant = z.iso.datetime({ offset: true });

const eventShape = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'Give the event a name')
    .max(120, 'Keep the name under 120 characters'),
  description: z
    .string()
    .trim()
    .max(2000, 'Keep the description under 2000 characters')
    .transform((value) => (value === '' ? null : value))
    .nullish(),
  address: z
    .string()
    .trim()
    .min(1, 'Where is it happening?')
    .max(300, 'Keep the address under 300 characters'),

  /**
   * Coordinates are what make "events near me" possible — `address` is a
   * string and you cannot measure distance from a string. Optional, because an
   * organiser may not have dropped a pin yet.
   */
  latitude: z.number().min(-90).max(90).nullish(),
  longitude: z.number().min(-180).max(180).nullish(),

  image_url: z.string().trim().max(2048).nullish(),

  starts_at: isoInstant,
  ends_at: isoInstant,
  daily_start_time: clockTime.nullish(),
  daily_end_time: clockTime.nullish(),

  link_url: externalUrl,
  ticket_url: externalUrl,

  /** The offering this event promotes. Ownership is enforced by the DB's FK. */
  product_id: eventIdSchema.nullish(),
});

/**
 * Rules that need more than one field. Kept in one place so create and update
 * cannot drift — and every one of them is ALSO a DB constraint, because a
 * Server Action is not the only way into this table.
 */
function refineEvent(
  input: {
    starts_at?: string;
    ends_at?: string;
    daily_start_time?: string | null;
    daily_end_time?: string | null;
    latitude?: number | null;
    longitude?: number | null;
  },
  ctx: z.RefinementCtx,
): void {
  if (input.starts_at && input.ends_at && input.ends_at <= input.starts_at) {
    ctx.addIssue({
      code: 'custom',
      path: ['ends_at'],
      message: 'The event has to end after it starts',
    });
  }

  const hasStart = input.daily_start_time != null;
  const hasEnd = input.daily_end_time != null;
  if (hasStart !== hasEnd) {
    ctx.addIssue({
      code: 'custom',
      path: [hasStart ? 'daily_end_time' : 'daily_start_time'],
      message: 'Set both daily times, or neither',
    });
  }

  // A single coordinate is not a location, and storing one would put the pin
  // on the equator or the prime meridian.
  const hasLat = input.latitude != null;
  const hasLng = input.longitude != null;
  if (hasLat !== hasLng) {
    ctx.addIssue({
      code: 'custom',
      path: [hasLat ? 'longitude' : 'latitude'],
      message: 'Set both coordinates, or neither',
    });
  }
}

export const createEventSchema = eventShape.superRefine(refineEvent);

export const updateEventSchema = eventShape.partial().superRefine(refineEvent);

/**
 * The owner's own status moves. Approving and rejecting are NOT here — those
 * belong to the admin decision schema below, and the DB trigger refuses them
 * from a non-admin regardless of what any schema says.
 */
export const ownerEventStatusSchema = z.enum(['draft', 'pending_review']);

/**
 * An admin's decision. Deliberately the same shape as the document review
 * (`documentDecisionSchema`) — approve may carry a note, reject must.
 */
export const eventDecisionSchema = z
  .object({
    decision: z.enum(['approve', 'reject']),
    note: z.string().trim().max(1000).optional(),
    /** Banner order, admin-only. */
    priority: z.number().int().min(0).max(100).optional(),
  })
  .refine(
    (value) =>
      value.decision === 'approve' ||
      (typeof value.note === 'string' && value.note.length > 0),
    {
      message: 'Tell them why, so they can fix it and resubmit',
      path: ['note'],
    },
  );

/**
 * A search term off the query string.
 *
 * Its own export because pages parse `?search=` one field at a time — they do
 * not build a whole filter object — and an unbounded term goes straight into a
 * `%…%` scan. Blank becomes `undefined` so "search for nothing" is not a
 * filter.
 */
export const searchTermSchema = z
  .string()
  .trim()
  .max(120)
  .transform((value) => (value === '' ? undefined : value));

export const eventFiltersSchema = z.object({
  page: z.number().int().min(1).default(1),
  per_page: z.number().int().min(1).max(50).default(12),
  search: searchTermSchema.optional(),
  status: z.union([eventStatusSchema, z.literal('')]).optional(),
  business_id: eventIdSchema.optional(),
  when: eventTimeFilterSchema.default('upcoming'),
});

export const nearbyEventsSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  radius: z.number().int().min(100).max(100_000).default(20_000),
});

export type CreateEventInput = z.infer<typeof createEventSchema>;
export type UpdateEventInput = z.infer<typeof updateEventSchema>;
export type EventDecisionInput = z.infer<typeof eventDecisionSchema>;
export type EventFiltersInput = z.infer<typeof eventFiltersSchema>;
export type NearbyEventsInput = z.infer<typeof nearbyEventsSchema>;
