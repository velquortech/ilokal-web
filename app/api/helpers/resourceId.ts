import { z } from 'zod';

/**
 * Is this route segment a real id, or something Postgres will choke on?
 *
 * 🔴 Why this exists. The mobile client requests
 * `GET /api/mobile/businesses/bida-ngayon/products` — a SLUG. Nothing
 * validated the segment, so `bida-ngayon` was handed to PostgREST as a `uuid`,
 * Postgres raised `22P02 invalid input syntax for type uuid`, and the route
 * answered **500**. Three separate costs:
 *
 *  - the wrong status code for what is really "no such shop";
 *  - a Sentry issue per endpoint for something that is not a fault
 *    (JAVASCRIPT-NEXTJS-6 / -E / -F);
 *  - and — the one that actually mattered — a 500 hides the finding. A 404
 *    would have said out loud that the app has a slug-based deep link this API
 *    does not serve. Nobody could see that through a driver error.
 *
 * `z.guid()`, NOT `z.uuid()`: Zod 4's `uuid()` is strict RFC-9562 and rejects
 * this app's own Postgres/seed ids (CLAUDE.md §Validation).
 */
const idSchema = z.guid();

export function isValidResourceId(id: string | undefined | null): boolean {
  if (!id) return false;
  return idSchema.safeParse(id).success;
}
