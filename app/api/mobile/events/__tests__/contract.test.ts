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
 * (see the 2026-08-06 shop-gallery entry in `.claude/CHANGELOG-ARCHIVE.md`).
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

/** A storage client stub — `resolveStorageUrl` is mocked, so it is never read. */
function client(): Parameters<typeof normaliseMobileEvent>[0] {
  return {} as Parameters<typeof normaliseMobileEvent>[0];
}

/**
 * A complete row, so the fixture cannot drift from `MobileEventRow` — the
 * partial object literals this replaced type-checked only because the row was
 * typed as an open record.
 */
function row(
  overrides: Partial<Parameters<typeof normaliseMobileEvent>[1]> = {},
): Parameters<typeof normaliseMobileEvent>[1] {
  return {
    id: 'e1',
    business_id: null,
    product_id: null,
    name: 'Night market',
    description: null,
    address: 'Iznart St',
    latitude: null,
    longitude: null,
    image_url: null,
    starts_at: '2036-01-01T00:00:00.000Z',
    ends_at: '2036-01-02T00:00:00.000Z',
    daily_start_time: null,
    daily_end_time: null,
    link_url: null,
    ticket_url: null,
    status: 'approved',
    created_at: '2035-01-01T00:00:00.000Z',
    updated_at: '2035-01-01T00:00:00.000Z',
    archived_at: null,
    business: null,
    product: null,
    ...overrides,
  };
}

describe('the shared projection', () => {
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

  it('mentions no private column ANYWHERE in the select, embeds included', () => {
    // `projectedColumns` drops every line containing `(`, so a private column
    // smuggled onto an embed line — `review_note, business:businesses ( … )` —
    // would slip past the two assertions above: a blind spot in exactly the
    // dimension this file exists to guard. A raw scan has no such hole.
    for (const column of PRIVATE_COLUMNS) {
      expect(MOBILE_EVENT_SELECT).not.toMatch(
        new RegExp(`\\b${column}\\b`, 'i'),
      );
    }
  });

  it('embeds the business and product refs with only their public fields', () => {
    // A `business:businesses (*)` would re-open the same hole one level down —
    // `businesses` carries owner ids and verification state.
    expect(MOBILE_EVENT_SELECT).toContain(
      'business:businesses ( id, shop_name, logo_url )',
    );
    // The product embed also selects `status` — products RLS does not gate it,
    // so the normaliser has to, and it is stripped before the response.
    expect(MOBILE_EVENT_SELECT).toContain(
      'product:products ( id, name, image_url, status )',
    );
  });
});

/**
 * All three mobile event surfaces. `nearby` is in the sweep because it is the
 * one that used to answer with a DIFFERENT shape — the `events_nearby` RPC's
 * flat 12-column row, which mobile's `eventsResponseSchema` (commented "also
 * the nearby shape") could never have parsed.
 */
const MOBILE_EVENT_ROUTES = [
  ['route.ts'],
  ['[id]/route.ts'],
  ['nearby/route.ts'],
];

describe('every mobile event route shares one projection', () => {
  it.each(MOBILE_EVENT_ROUTES)(
    '%s selects through the shared contract and never with a wildcard',
    (file) => {
      const code = source(file);
      expect(code).toContain('MOBILE_EVENT_SELECT');
      // The two shapes a wildcard takes in a PostgREST select.
      expect(code).not.toMatch(/select\(\s*['"`]\s*\*/);
      expect(code).not.toMatch(/^\s*\*\s*,\s*$/m);
    },
  );

  it.each(MOBILE_EVENT_ROUTES)(
    '%s shapes rows through the shared normaliser rather than its own copy',
    (file) => {
      const code = source(file);
      expect(code).toContain('normaliseMobileEvent');
      // Each route hand-rolling the embed unwrap is how the three drift.
      expect(code).not.toContain('firstOrNull');
    },
  );

  it.each(MOBILE_EVENT_ROUTES)(
    '%s names an unexpected throw rather than swallowing it',
    (file) => {
      const code = source(file);

      // A bare `catch {}` binds nothing, so the cause is destroyed and a 500
      // here is observable by no means at all — not Sentry, not the log
      // stream. That is the blind spot PR #43 closed across the business
      // routes, and these three shipped with the same shape. The branches that
      // handle a PostgREST `error` are the EXPECTED failures; this catch holds
      // the unexpected ones, which are the ones worth a name.
      expect(code).not.toMatch(/catch\s*\{/);
      expect(code).toContain('loggedServerError');
    },
  );

  it('nearby never re-emits the RPC row it used to return', () => {
    const code = source('nearby/route.ts');
    // `business_name` is the RPC's flat string; mobile needs a `business`
    // OBJECT, and the presence of the former means the flat row leaked back.
    expect(code).not.toContain('business_name');
    // Distance is the whole point of the endpoint and must survive the
    // hydrate, which reads by id and knows nothing about it.
    expect(code).toContain('distance_meters');
  });
});

describe('route-level guards and row shaping', () => {
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
    const resolved = normaliseMobileEvent(client(), row());

    expect(resolved.image_url).toBeNull();
    expect(resolved.business).toBeNull();
    expect(resolved.product).toBeNull();
  });

  it('unwraps a to-one embed PostgREST returned as an array', () => {
    const resolved = normaliseMobileEvent(
      client(),
      row({
        business: [{ id: 'b1', shop_name: 'Roastery', logo_url: null }],
        product: [
          { id: 'p1', name: 'Kape', image_url: null, status: 'active' },
        ],
      }),
    );

    // Reading `.shop_name` off the array yields undefined, which renders as a
    // shop with no name.
    expect(resolved.business?.shop_name).toBe('Roastery');
    expect(resolved.product?.name).toBe('Kape');
  });

  it.each([['unlisted'], ['disabled']])(
    'drops a %s offering instead of republishing it on the event',
    (status) => {
      // Products RLS (20260526000007) gates only `archived_at` and the shop
      // being verified — NOT `status` — so anon can still read a row the owner
      // has taken down. Every other public product read filters
      // `status = 'active'`; embedding it unfiltered would put an offering the
      // shop unlisted back in front of customers.
      const resolved = normaliseMobileEvent(
        client(),
        row({ product: [{ id: 'p1', name: 'Kape', image_url: null, status }] }),
      );

      expect(resolved.product).toBeNull();
    },
  );

  it('never returns the product `status` it selected in order to decide', () => {
    // `status` is projected so the gate above can read it, and mobile's product
    // contract is `{ id, name, image_url }` — returning an undeclared field is
    // how the next reader starts depending on it.
    const resolved = normaliseMobileEvent(
      client(),
      row({
        product: [
          { id: 'p1', name: 'Kape', image_url: null, status: 'active' },
        ],
      }),
    );

    expect(resolved.product).toEqual({
      id: 'p1',
      name: 'Kape',
      image_url: null,
    });
  });
});
