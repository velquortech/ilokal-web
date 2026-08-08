/**
 * The mobile events READ CONTRACT.
 *
 * These assertions exist because the failure they guard is invisible from the
 * client: mobile's Zod schemas (`schemas/events.ts` in ilokal-mobile) are plain
 * `z.object()`, which STRIPS unknown keys. So a route that over-projects ships
 * an admin's review notes to every anonymous device and nothing anywhere
 * reports a symptom — no parse error, no render fault, no log line.
 *
 * A behavioural test cannot catch that (the mocks return whatever they are
 * handed), so the projection itself is asserted, plus a source sweep so the
 * two routes cannot quietly go back to `select('*')`.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  MOBILE_EVENT_SELECT,
  normaliseMobileEvent,
} from '@/app/api/helpers/mobileEvent';

const ROUTES_DIR = join(process.cwd(), 'app/api/mobile/events');

/**
 * Read a route's source with comments stripped.
 *
 * The stripping is load-bearing, not tidiness. These routes QUOTE the things
 * they removed — `select('*')`, the old `/^[0-9a-f-]{8,64}$/i` guard — so that
 * the next reader knows why the current shape is what it is. A sweep over raw
 * text matches those explanations and fails, and the cheapest way to make it
 * pass is to delete the explanation. The repo has already learned this once
 * (see the shop-gallery entry in `.claude/CHANGELOG.md`).
 */
function source(relative: string): string {
  return readFileSync(join(ROUTES_DIR, relative), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:])\/\/.*$/gm, '$1');
}

/** The scalar columns the select projects (embed lines carry parentheses). */
function projectedColumns(select: string): string[] {
  return select
    .split('\n')
    .map((line) => line.trim().replace(/,$/, ''))
    .filter((line) => line.length > 0 && !line.includes('('));
}

/**
 * The canonical list is `MobileEventWithRefs` in the mobile repo
 * (`types/events.ts`), which documents itself as `EventWithRefs`
 * (lib/types/event.ts) "minus the columns mobile never renders (review flow,
 * WKB location, priority)". Restated here because the two repos cannot import
 * from each other — which is exactly why it needs an assertion.
 */
const MOBILE_EVENT_COLUMNS = [
  'id',
  'business_id',
  'product_id',
  'name',
  'description',
  'address',
  'latitude',
  'longitude',
  'image_url',
  'starts_at',
  'ends_at',
  'daily_start_time',
  'daily_end_time',
  'link_url',
  'ticket_url',
  'status',
  'created_at',
  'updated_at',
  'archived_at',
];

/**
 * Columns an anonymous mobile client must never receive.
 *
 * `review_note` is the admin's rejection text about an unpublished proposal;
 * `reviewed_by` is an `auth.users` id; `priority` is internal banner placement;
 * `location` is the WKB the generated lat/lng columns exist to replace.
 */
const PRIVATE_COLUMNS = [
  'review_note',
  'reviewed_by',
  'reviewed_at',
  'priority',
  'location',
];

describe('mobile events read contract', () => {
  it('projects exactly the columns mobile declares, in no more and no fewer', () => {
    expect(projectedColumns(MOBILE_EVENT_SELECT).sort()).toEqual(
      [...MOBILE_EVENT_COLUMNS].sort(),
    );
  });

  it('never projects a review-flow, priority or raw-location column', () => {
    const projected = projectedColumns(MOBILE_EVENT_SELECT);
    for (const column of PRIVATE_COLUMNS) {
      expect(projected).not.toContain(column);
    }
  });

  it('embeds the business and product refs with only their public fields', () => {
    // A `business:businesses (*)` would re-open the same hole one level down —
    // `businesses` carries owner ids and verification state.
    expect(MOBILE_EVENT_SELECT).toContain(
      'business:businesses ( id, shop_name, logo_url )',
    );
    expect(MOBILE_EVENT_SELECT).toContain(
      'product:products ( id, name, image_url )',
    );
  });

  it.each([['route.ts'], ['[id]/route.ts']])(
    '%s selects through the shared contract and never with a wildcard',
    (file) => {
      const code = source(file);
      expect(code).toContain('MOBILE_EVENT_SELECT');
      // The two shapes a wildcard takes in a PostgREST select.
      expect(code).not.toMatch(/select\(\s*['"`]\s*\*/);
      expect(code).not.toMatch(/^\s*\*\s*,\s*$/m);
    },
  );

  it.each([['route.ts'], ['[id]/route.ts']])(
    '%s shapes rows through the shared normaliser rather than its own copy',
    (file) => {
      const code = source(file);
      expect(code).toContain('normaliseMobileEvent');
      // Each route hand-rolling the embed unwrap is how the two drift.
      expect(code).not.toContain('firstOrNull');
    },
  );

  it('validates the detail id with z.guid(), not a hand-rolled character class', () => {
    const code = source('[id]/route.ts');
    expect(code).toContain('eventIdSchema');
    // The previous guard, `/^[0-9a-f-]{8,64}$/i`, accepted a string of dashes.
    expect(code).not.toMatch(/\[0-9a-f-\]\{/);
  });

  it('resolves every stored image path, including a null one, to a usable value', () => {
    // `null` in, `null` out — not the literal string "null", which is what an
    // unguarded template interpolation produces and what renders as a broken
    // image on the device.
    const resolved = normaliseMobileEvent(
      {} as Parameters<typeof normaliseMobileEvent>[0],
      { id: 'e1', image_url: null, business: null, product: null },
    );
    expect(resolved.image_url).toBeNull();
    expect(resolved.business).toBeNull();
    expect(resolved.product).toBeNull();
  });

  it('unwraps a to-one embed PostgREST returned as an array', () => {
    const resolved = normaliseMobileEvent(
      {} as Parameters<typeof normaliseMobileEvent>[0],
      {
        id: 'e1',
        image_url: null,
        business: [{ id: 'b1', shop_name: 'Roastery', logo_url: null }],
        product: [{ id: 'p1', name: 'Kape', image_url: null }],
      },
    );
    // Reading `.shop_name` off the array yields undefined, which renders as a
    // shop with no name.
    expect((resolved.business as { shop_name: string }).shop_name).toBe(
      'Roastery',
    );
    expect((resolved.product as { name: string }).name).toBe('Kape');
  });
});
