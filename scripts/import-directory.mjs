#!/usr/bin/env node
/* global console, process, fetch, URLSearchParams, setTimeout */
/**
 * Seed the business directory for Iloilo City from OpenStreetMap.
 *
 * iLokal's open beta has a cold-start problem: `nearby_businesses_filtered`
 * only returns owner-registered businesses, so a new user opens Explore to a
 * near-empty map. This fills it with real local businesses that owners can then
 * claim.
 *
 * Usage:
 *   node scripts/import-directory.mjs --dry-run          # fetch, classify, print; no writes
 *   node scripts/import-directory.mjs --dry-run --geocode # also exercise Nominatim
 *   node scripts/import-directory.mjs                     # write to the LOCAL stack
 *   node scripts/import-directory.mjs --cloud             # write to the CLOUD project
 *   node scripts/import-directory.mjs --limit 50          # cap, for a smoke test
 *   node scripts/import-directory.mjs --no-geocode        # skip address backfill
 *   node scripts/import-directory.mjs --refetch           # ignore the Overpass cache
 *
 * Env: .env for the local stack (the Makefile writes it from `supabase start`
 *      output), .env.cloud for --cloud. Needs NEXT_PUBLIC_SUPABASE_URL and
 *      SUPABASE_SERVICE_ROLE_KEY.
 *
 * ── Licensing, which is not optional ────────────────────────────────────────
 * OSM data is ODbL: commercial use is fine, attribution is required. Every row
 * written here records `source='osm'` and `source_license='ODbL'` so the
 * attribution surface can be generated from the data rather than hand-kept.
 *
 * **No images are ever imported.** Place photos belong to their contributors
 * and are not sublicensed to us. The `businesses_seeded_no_images` constraint
 * (migration 20261001000000) enforces this at the write boundary, because
 * `resolveStorageUrl` passes any `http(s)://` value straight through to the
 * client — nothing in the read path could catch a pasted CDN URL. No ratings or
 * reviews are imported either, and third-party ratings are not used to select
 * what to seed.
 *
 * ── Idempotency ────────────────────────────────────────────────────────────
 * Re-running is safe and is the intended way to pick up upstream corrections:
 * business ids are derived deterministically from the OSM ref, and the partial
 * unique index on `(source, source_ref)` is the backstop.
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';

import {
  classify,
  refineFood,
  isInstitutional,
  isKnownChain,
  referencedCategories,
} from './directory/category-map.mjs';

// ── Configuration ──────────────────────────────────────────────────────────

/** OSM relation for Iloilo City. Overpass area id = 3600000000 + relation id. */
const CITY_RELATION = 3499101;
const CITY_AREA = 3600000000 + CITY_RELATION;

/**
 * Bounding box of that relation, as Nominatim reports it. Used as a global
 * `[bbox:]` setting to narrow the candidate set cheaply — the `area()` filter
 * then clips to the real polygon. Area filters alone time out on the public
 * Overpass instance; bbox alone leaks neighbouring municipalities (Pavia).
 */
const CITY_BBOX = '10.6393150,122.4879650,10.7811925,122.6171611';

const CITY_NAME = 'Iloilo City';
const PROVINCE = 'Iloilo';
const ZIP = '5000';

const OVERPASS = 'https://overpass-api.de/api/interpreter';
const NOMINATIM = 'https://nominatim.openstreetmap.org/reverse';
/** Nominatim's usage policy: max 1 request/second, and a real User-Agent. */
const GEOCODE_INTERVAL_MS = 1100;
const UA = 'iLokal-directory-import/1.0 (+https://ilokal.shop)';

/**
 * Identity of the placeholder owner that holds unclaimed listings.
 * `businesses.owner_id` is NOT NULL, so seeded rows need a holder; claiming
 * reassigns it. Deliberately NOT the dev `seedowner@ilokal.dev`, which is a
 * local-seed convention — this one runs against cloud.
 */
const DIRECTORY_EMAIL = 'directory@ilokal.shop';
const DIRECTORY_NAME = 'iLokal Directory';

/**
 * Seeded rows are backdated so `is_new` does not fire. That flag is
 * `created_at > NOW() - 7 days` (migration 20260812120000), so a bulk import
 * would otherwise light up the "New" badge on every row in the feed.
 */
const BACKDATE_ISO = '2026-01-01T00:00:00.000Z';

const DATA_DIR = 'data/directory';

// ── CLI ────────────────────────────────────────────────────────────────────

const argv = process.argv.slice(2);
const has = (f) => argv.includes(f);
const value = (f, d) => {
  const i = argv.indexOf(f);
  return i >= 0 && argv[i + 1] ? argv[i + 1] : d;
};

const DRY = has('--dry-run');
const CLOUD = has('--cloud');
const LIMIT = Number(value('--limit', '0')) || 0;
// Geocoding is slow (1 req/s), so a dry run skips it unless asked.
const GEOCODE = has('--no-geocode') ? false : DRY ? has('--geocode') : true;

const log = (...a) => console.log(...a);
const fail = (msg) => {
  console.error(`\n✖ ${msg}`);
  process.exit(1);
};

// ── Supabase ───────────────────────────────────────────────────────────────

function loadEnv(file) {
  const env = {};
  try {
    for (const line of readFileSync(file, 'utf8').split('\n')) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, '');
    }
  } catch {
    fail(`Cannot read ${file}`);
  }
  return env;
}

function connect() {
  const file = CLOUD ? '.env.cloud' : '.env';
  const env = loadEnv(file);
  const url = env.NEXT_PUBLIC_SUPABASE_URL;
  const key = env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    fail(`Missing NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY in ${file}`);
  }
  const isLocal = /127\.0\.0\.1|localhost/.test(url);
  // Guard both ways: writing the cloud project while meaning to test locally is
  // the expensive mistake, and the reverse wastes a long run.
  if (CLOUD && isLocal) fail(`--cloud given but ${file} points at a local URL (${url})`);
  if (!CLOUD && !isLocal) {
    fail(`${file} points at a remote URL (${url}). Pass --cloud to mean it.`);
  }
  log(`  target: ${isLocal ? 'LOCAL' : 'CLOUD'} ${url}`);
  return createClient(url, key, { auth: { persistSession: false } });
}

// ── Steps ──────────────────────────────────────────────────────────────────

/**
 * Resolve every category name the map can emit to its id, and hard-fail on any
 * that is missing. A taxonomy rename should break the run loudly rather than
 * silently importing nothing.
 */
async function loadCategories(db) {
  const { data, error } = await db
    .from('business_categories')
    .select('id, name, business_types!inner(name, is_active)')
    .eq('business_types.is_active', true);
  if (error) fail(`Could not read business_categories: ${error.message}`);

  const byName = new Map(data.map((r) => [r.name, r.id]));
  const missing = referencedCategories().filter((n) => !byName.has(n));
  if (missing.length) {
    fail(
      `The category map references ${missing.length} name(s) that do not exist ` +
        `under an active vertical:\n    ${missing.join('\n    ')}\n` +
        `  Fix scripts/directory/category-map.mjs, or check the taxonomy migrations are applied.`,
    );
  }
  log(`  categories: ${byName.size} active, all ${referencedCategories().length} mapped names resolved`);
  return byName;
}

/**
 * Find or create the directory owner through the Admin API.
 *
 * Deliberately NOT raw SQL against `auth.users`: that schema is Supabase's and
 * shifts between versions. The Admin API is the supported path, and it leaves a
 * real auth row so `profiles.id -> auth.users(id)` is satisfied without the
 * `session_replication_role = replica` trick the seed files use.
 *
 * The account cannot be used: the password is random and never recorded, and
 * the email is never confirmed.
 */
async function ensureDirectoryOwner(db) {
  const { data: existing } = await db
    .from('profiles')
    .select('id')
    .eq('email', DIRECTORY_EMAIL)
    .maybeSingle();
  if (existing?.id) {
    log(`  directory owner: reusing ${DIRECTORY_EMAIL}`);
    return existing.id;
  }

  const { data: created, error } = await db.auth.admin.createUser({
    email: DIRECTORY_EMAIL,
    password: createHash('sha256').update(`${Date.now()}-${Math.random()}`).digest('hex'),
    email_confirm: false,
    user_metadata: { full_name: DIRECTORY_NAME, directory_placeholder: true },
  });
  if (error) fail(`Could not create the directory auth user: ${error.message}`);

  const id = created.user.id;
  // A DB trigger auto-creates the profile row on auth.users insert; make sure it
  // carries the right role and name either way.
  const { error: upErr } = await db
    .from('profiles')
    .upsert({ id, email: DIRECTORY_EMAIL, full_name: DIRECTORY_NAME, role: 'business_owner' });
  if (upErr) fail(`Could not upsert the directory profile: ${upErr.message}`);

  log(`  directory owner: created ${DIRECTORY_EMAIL}`);
  return id;
}

/**
 * Fetch named POIs inside the city polygon, through a disk cache.
 *
 * Overpass is a free, shared service that rate-limits and 504s under load, and
 * this query pulls ~2,200 elements. Re-running the importer to adjust the
 * category map should not re-ask for the same extract — so the raw response is
 * cached, keyed by a hash of the query itself. Change the query and the cache
 * invalidates on its own; pass `--refetch` to force a fresh pull.
 */
async function fetchOverpass() {
  const query = `[out:json][timeout:300][bbox:${CITY_BBOX}];
area(${CITY_AREA})->.city;
(
  nwr["shop"]["name"](area.city);
  nwr["amenity"~"^(restaurant|cafe|fast_food|bar|pub|ice_cream|food_court|bakery|pharmacy|clinic|dentist|doctors|veterinary|car_repair|car_wash|internet_cafe|cinema|theatre|nightclub|events_venue|driving_school|language_school|music_school|kindergarten)$"]["name"](area.city);
  nwr["leisure"~"^(fitness_centre|sports_centre|bowling_alley|amusement_arcade|spa)$"]["name"](area.city);
  nwr["healthcare"~"^(laboratory|physiotherapist|psychotherapist|dentist|doctor)$"]["name"](area.city);
  nwr["craft"]["name"](area.city);
);
out tags center;`;

  const queryHash = createHash('sha256').update(query).digest('hex').slice(0, 16);
  const cacheFile = `${DATA_DIR}/overpass-cache.json`;

  if (!has('--refetch')) {
    try {
      const cached = JSON.parse(readFileSync(cacheFile, 'utf8'));
      if (cached.queryHash === queryHash) {
        log(`  using cached extract from ${cached.fetchedAt} (--refetch to refresh)`);
        return cached.elements;
      }
      log('  cached extract is for a different query; refetching');
    } catch {
      // no cache yet
    }
  }

  // Transient 429/504 from a shared service is normal under load, so back off
  // rather than failing the whole run.
  const BACKOFF_MS = [0, 15000, 45000];
  for (let attempt = 0; attempt < BACKOFF_MS.length; attempt++) {
    if (BACKOFF_MS[attempt]) {
      log(`  retrying in ${BACKOFF_MS[attempt] / 1000}s…`);
      await new Promise((r) => setTimeout(r, BACKOFF_MS[attempt]));
    }
    const res = await fetch(OVERPASS, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'User-Agent': UA },
      body: new URLSearchParams({ data: query }),
    });
    if (res.ok) {
      const json = await res.json();
      const elements = json.elements ?? [];
      mkdirSync(DATA_DIR, { recursive: true });
      writeFileSync(
        cacheFile,
        JSON.stringify({ queryHash, fetchedAt: new Date().toISOString(), elements }),
      );
      log(`  fetched ${elements.length} elements, cached for re-runs`);
      return elements;
    }
    log(`  Overpass returned ${res.status} (attempt ${attempt + 1}/${BACKOFF_MS.length})`);
  }
  fail(
    'Overpass kept failing. It rate-limits per IP; wait a few minutes and retry, ' +
      'or run against a mirror by editing OVERPASS.',
  );
}

/** Normalize one OSM element, or return a reason it was dropped. */
function normalize(el, categories) {
  const t = el.tags ?? {};
  const name = (t.name ?? '').trim();
  const lat = el.lat ?? el.center?.lat;
  const lng = el.lon ?? el.center?.lon;

  if (!name) return { drop: 'no name' };
  if (lat == null || lng == null) return { drop: 'no coordinates' };
  // Chains are excluded: the welcome screen says "support your local heroes",
  // and a chain branch will never claim its listing through our flow anyway.
  // The `brand` tag is the primary signal but mappers often omit it — the first
  // dry run let ten SM properties, Robinsons and Gaisano through — so a
  // name-based fallback backs it up.
  if (t.brand || t['brand:wikidata']) return { drop: `chain (${t.brand ?? 'branded'})` };
  if (isKnownChain(name)) return { drop: 'chain (by name)' };
  if (isInstitutional(name)) return { drop: 'civic facility' };

  const base = classify(t);
  if (!base.category) return { drop: `unmapped ${base.via}` };
  const { category } = refineFood(base.category, t);

  const categoryId = categories.get(category);
  if (!categoryId) return { drop: `category not in DB: ${category}` };

  const ref = `${el.type}/${el.id}`;
  return {
    ref,
    // Deterministic id from the OSM ref: a re-run addresses the same row, so the
    // import is idempotent without needing to read back first.
    id: uuidFromRef(ref),
    name,
    lat: round6(lat),
    lng: round6(lng),
    category,
    categoryId,
    // `addr:street` is present on ~35% of records; the rest are filled by
    // reverse geocoding, or left null.
    street: (t['addr:street'] ?? '').trim() || null,
    barangay: (t['addr:suburb'] ?? t['addr:village'] ?? t['addr:neighbourhood'] ?? '').trim() || null,
    via: base.via,
  };
}

/** A v5-shaped UUID derived from the upstream ref, so re-runs are stable. */
function uuidFromRef(ref) {
  const h = createHash('sha1').update(`ilokal:osm:${ref}`).digest('hex');
  return [
    h.slice(0, 8),
    h.slice(8, 12),
    `5${h.slice(13, 16)}`,
    ((parseInt(h.slice(16, 18), 16) & 0x3f) | 0x80).toString(16) + h.slice(18, 20),
    h.slice(20, 32),
  ].join('-');
}

const round6 = (n) => Math.round(Number(n) * 1e6) / 1e6;

/**
 * Fill missing street addresses from coordinates. Nominatim permits this at
 * 1 req/s with a real User-Agent; results are cached to disk so a re-run does
 * not re-ask for the same point.
 */
async function reverseGeocode(records) {
  const cacheFile = `${DATA_DIR}/geocode-cache.json`;
  let cache = {};
  try {
    cache = JSON.parse(readFileSync(cacheFile, 'utf8'));
  } catch {
    // first run
  }

  const todo = records.filter((r) => !r.street && !cache[r.ref]);
  log(`  geocoding: ${todo.length} records need an address (${Object.keys(cache).length} cached)`);
  if (todo.length) {
    const mins = Math.ceil((todo.length * GEOCODE_INTERVAL_MS) / 60000);
    log(`             ~${mins} min at Nominatim's 1 req/s limit`);
  }

  let done = 0;
  for (const r of todo) {
    try {
      const url = `${NOMINATIM}?lat=${r.lat}&lon=${r.lng}&format=jsonv2&zoom=18&addressdetails=1`;
      const res = await fetch(url, { headers: { 'User-Agent': UA } });
      if (res.ok) {
        const a = (await res.json()).address ?? {};
        cache[r.ref] = {
          street: a.road ?? a.pedestrian ?? a.residential ?? null,
          barangay: a.suburb ?? a.village ?? a.neighbourhood ?? a.quarter ?? null,
        };
      } else {
        cache[r.ref] = { street: null, barangay: null };
      }
    } catch {
      cache[r.ref] = { street: null, barangay: null };
    }
    if (++done % 50 === 0) {
      log(`             ${done}/${todo.length}`);
      mkdirSync(DATA_DIR, { recursive: true });
      writeFileSync(cacheFile, JSON.stringify(cache));
    }
    await new Promise((r2) => setTimeout(r2, GEOCODE_INTERVAL_MS));
  }

  mkdirSync(DATA_DIR, { recursive: true });
  writeFileSync(cacheFile, JSON.stringify(cache, null, 1));

  let filled = 0;
  for (const r of records) {
    const c = cache[r.ref];
    if (!c) continue;
    if (!r.street && c.street) {
      r.street = c.street;
      filled++;
    }
    if (!r.barangay && c.barangay) r.barangay = c.barangay;
  }
  log(`  geocoding: filled ${filled} addresses`);
}

/**
 * Drop records that duplicate a business already in the table.
 *
 * `(source, source_ref)` is handled by the unique index, but an OSM record may
 * also describe a shop an owner already registered. Matching on a normalized
 * name within ~150 m avoids seeding a twin of a real, claimed listing.
 */
async function dedupe(db, records) {
  const { data, error } = await db
    .from('businesses')
    .select('shop_name, source, source_ref, location')
    .is('archived_at', null);
  if (error) fail(`Could not read existing businesses: ${error.message}`);

  const norm = (s) =>
    s
      .toLowerCase()
      .normalize('NFKD')
      .replace(/[^a-z0-9]+/g, ' ')
      .trim();

  const existingRefs = new Set(
    data.filter((b) => b.source_ref).map((b) => `${b.source}|${b.source_ref}`),
  );
  const existing = data.map((b) => ({
    name: norm(b.shop_name ?? ''),
    lat: Number(b.location?.latitude),
    lng: Number(b.location?.longitude),
  }));

  const kept = [];
  let byRef = 0;
  let byName = 0;
  for (const r of records) {
    if (existingRefs.has(`osm|${r.ref}`)) {
      byRef++;
      continue;
    }
    const n = norm(r.name);
    const clash = existing.some(
      (e) =>
        e.name === n &&
        Number.isFinite(e.lat) &&
        Math.abs(e.lat - r.lat) < 0.0014 &&
        Math.abs(e.lng - r.lng) < 0.0014,
    );
    if (clash) {
      byName++;
      continue;
    }
    kept.push(r);
  }
  log(`  dedupe: ${byRef} already imported, ${byName} match an existing listing by name+location`);
  return kept;
}

/** Insert businesses and their branch pins. */
async function insert(db, records, ownerId) {
  const CHUNK = 200;
  let businesses = 0;
  let branches = 0;

  for (let i = 0; i < records.length; i += CHUNK) {
    const slice = records.slice(i, i + CHUNK);

    const bizRows = slice.map((r) => ({
      id: r.id,
      owner_id: ownerId,
      shop_name: r.name,
      // No description. OSM has little, and copying editorial text is the one
      // field that would be expression rather than fact.
      description: null,
      // The 3x coordinate invariant (supabase/seeds/businesses.sql:9-11): the
      // same point appears in latitude/longitude, in the geometry mirror string,
      // and in the branch's PostGIS point below.
      location: {
        province: PROVINCE,
        city: CITY_NAME,
        barangay: r.barangay,
        street_address: r.street,
        zip_code: ZIP,
        latitude: r.lat,
        longitude: r.lng,
        geometry: `lat:${r.lat},lng:${r.lng}`,
      },
      category_id: r.categoryId,
      // Explicit, and it survives: `trg_set_business_initial_status` returns
      // early when `is_admin()` is true, which it is for the service role
      // (auth.uid() IS NULL). Without 'verified' the row is invisible to the
      // app, since both the RPC and RLS gate on it.
      status: 'verified',
      source: 'osm',
      source_ref: r.ref,
      source_license: 'ODbL',
      // Unclaimed by construction. claimed_at/claimed_by stay NULL.
      created_at: BACKDATE_ISO,
      updated_at: BACKDATE_ISO,
    }));

    // Belt and braces over the DB constraint: assert in the client too, so a
    // future edit that starts importing images fails here with a clear message
    // rather than as a constraint violation 200 rows in.
    for (const b of bizRows) {
      if (b.logo_url || b.banner_url || b.interior_images) {
        fail(`Refusing to write imagery on a seeded row (${b.shop_name}).`);
      }
    }

    const { error: bizErr } = await db.from('businesses').upsert(bizRows, {
      onConflict: 'id',
      ignoreDuplicates: true,
    });
    if (bizErr) fail(`Business insert failed at offset ${i}: ${bizErr.message}`);
    businesses += bizRows.length;

    // A listing with no branch pin is invisible: nearby_businesses_filtered
    // INNER JOINs branches and requires a non-null location.
    const branchRows = slice.map((r) => ({
      // Derived from the same ref as the business, so a re-run addresses the
      // same pin instead of adding a second one. `branches` has no unique
      // constraint on business_id, so without a stable id the second run would
      // silently double every pin — the businesses would be skipped by
      // ignoreDuplicates while the branches went through.
      id: uuidFromRef(`${r.ref}:branch`),
      business_id: r.id,
      name: r.name,
      address: [r.street, r.barangay, CITY_NAME].filter(Boolean).join(', '),
      // WKT through PostgREST, the same way lib/api/business/business.ts writes
      // it. Longitude first, per PostGIS.
      location: `POINT(${r.lng} ${r.lat})`,
      // `status` is omitted on purpose: the column defaults to 'active', and the
      // check constraint only accepts pending_review | active | rejected. (An
      // earlier version passed 'verified' — that is the *businesses* enum, and
      // it failed the constraint.) Letting the default apply means we follow it
      // if it ever changes.
    }));
    const { error: brErr } = await db
      .from('branches')
      .upsert(branchRows, { onConflict: 'id', ignoreDuplicates: true });
    if (brErr) fail(`Branch insert failed at offset ${i}: ${brErr.message}`);
    branches += branchRows.length;

    log(`  inserted ${Math.min(i + CHUNK, records.length)}/${records.length}`);
  }
  return { businesses, branches };
}

// ── Main ───────────────────────────────────────────────────────────────────

log(`\niLokal directory import — ${CITY_NAME}${DRY ? '  [DRY RUN]' : ''}`);

const db = DRY && !GEOCODE ? null : connect();
let categories;
if (db) {
  categories = await loadCategories(db);
} else {
  // A pure dry run still needs ids to shape records; use the names as stand-ins.
  categories = new Map(referencedCategories().map((n) => [n, `dry-${n}`]));
  log('  categories: dry run, not resolved against the DB');
}

log('\nfetching from Overpass…');
const elements = await fetchOverpass();
log(`  ${elements.length} named POIs inside the city polygon`);

const drops = new Map();
let records = [];
for (const el of elements) {
  const r = normalize(el, categories);
  if (r.drop) {
    const key = r.drop.startsWith('chain') ? 'chain' : r.drop;
    drops.set(key, (drops.get(key) ?? 0) + 1);
    continue;
  }
  records.push(r);
}

log(`\nclassified: ${records.length} importable`);
const topDrops = [...drops].sort((a, b) => b[1] - a[1]).slice(0, 10);
for (const [reason, n] of topDrops) log(`  dropped ${String(n).padStart(4)}  ${reason}`);

const byCat = new Map();
for (const r of records) byCat.set(r.category, (byCat.get(r.category) ?? 0) + 1);
log('\ntop categories:');
for (const [c, n] of [...byCat].sort((a, b) => b[1] - a[1]).slice(0, 12)) {
  log(`  ${String(n).padStart(4)}  ${c}`);
}

if (GEOCODE) {
  log('');
  await reverseGeocode(records);
}

if (db) {
  log('');
  records = await dedupe(db, records);
}

if (LIMIT && records.length > LIMIT) {
  log(`  --limit ${LIMIT}: trimming from ${records.length}`);
  records = records.slice(0, LIMIT);
}

mkdirSync(DATA_DIR, { recursive: true });
writeFileSync(`${DATA_DIR}/normalized.json`, JSON.stringify(records, null, 1));
log(`\nwrote ${records.length} normalized records to ${DATA_DIR}/normalized.json`);

if (DRY) {
  log('\nDRY RUN — nothing written. Sample:');
  for (const r of records.slice(0, 5)) {
    log(`  ${r.name}`);
    log(`    ${r.category}  (${r.via})  ${r.lat},${r.lng}`);
    log(`    ${r.street ?? '(no street)'} / ${r.barangay ?? '(no barangay)'}  ref=${r.ref}`);
  }
  process.exit(0);
}

const ownerId = await ensureDirectoryOwner(db);
log('');
const { businesses, branches } = await insert(db, records, ownerId);
log(`\n✓ ${businesses} businesses, ${branches} branch pins. All unclaimed, image-less, ODbL-attributed.`);
log(`  Attribution obligation: © OpenStreetMap contributors (ODbL).`);
