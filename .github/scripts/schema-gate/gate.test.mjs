// Run: node --test .github/scripts/schema-gate/
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { selectColumns, extract, decide, missingReason } from './gate.mjs';

/** Writes `files` ({ 'lib/x.ts': src }) into a temp repo root. */
function repo(files) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'schema-gate-'));
  for (const [rel, src] of Object.entries(files)) {
    fs.mkdirSync(path.dirname(path.join(root, rel)), { recursive: true });
    fs.writeFileSync(path.join(root, rel), src);
  }
  return root;
}
const keys = (refs) =>
  refs
    .map((r) =>
      r.kind === 'rpc'
        ? `rpc:${r.fn}(${r.args})`
        : r.kind === 'table'
          ? `t:${r.table}`
          : `c:${r.table}.${r.column}`,
    )
    .sort();

const SCHEMA = {
  columns: [
    { table: 'businesses', column: 'id' },
    { table: 'businesses', column: 'shop_name' },
    { table: 'coupons', column: 'id' },
    { table: 'coupons', column: 'code' },
  ],
  functions: [
    { name: 'nearby', args: ['lat', 'lng', 'page_size'], defaults: 1 },
  ],
  migrations: ['001', '002'],
};

test('selectColumns keeps top-level columns only', () => {
  assert.deepEqual(
    selectColumns(
      'id, shop_name, owner:profiles!owner_id(full_name), cat:category_id, price::text, meta->>slug, *, ...rest',
    ),
    ['id', 'shop_name', 'category_id', 'price', 'meta'],
  );
});

test('extract: chains, writes, onConflict; skips storage and Array.from', () => {
  const root = repo({
    'lib/a.ts': `
      export async function f(s) {
        await s.from('businesses').select('id, shop_name').eq('owner_id', 1).order('created_at');
        await s.from('coupons').upsert({ code: 'x', business_id: 1 }, { onConflict: 'code' });
        await s.storage.from('logos').upload('p', b);
        Array.from('abc');
      }`,
  });
  assert.deepEqual(keys(extract(root)), [
    'c:businesses.created_at',
    'c:businesses.id',
    'c:businesses.owner_id',
    'c:businesses.shop_name',
    'c:coupons.business_id',
    'c:coupons.code',
    'c:coupons.code',
    't:businesses',
    't:coupons',
  ]);
});

test('extract: follows a query through its variable, per function', () => {
  const root = repo({
    'lib/b.ts': `
      function one(s) { let query = s.from('businesses').select('id'); query = query.eq('origin', 'owner'); }
      function two(s) { let query = wallet(s); query = query.order('redeemed_at'); }`,
  });
  const k = keys(extract(root));
  assert.ok(k.includes('c:businesses.origin'), 'traced through the variable');
  // The second `query` comes from a helper the parser cannot see into: it is
  // checked as "on SOME table" — never attributed to the first function's.
  assert.ok(
    !k.includes('c:businesses.redeemed_at'),
    "another function's `query` is not businesses",
  );
  assert.ok(k.includes('c:null.redeemed_at'));
});

test('extract: rpc args, and filters on an rpc result are not table columns', () => {
  const root = repo({
    'lib/c.ts': `
      async function f(s) {
        await s.rpc('nearby', { lat: 1, lng: 2, claimed_only: true });
        let query = s.rpc('business_products', { p_id: 1 });
        query = query.eq('category->>slug', 'x');
      }`,
  });
  const k = keys(extract(root));
  assert.ok(k.includes('rpc:nearby(lat,lng,claimed_only)'));
  assert.ok(!k.some((x) => x.includes('category')));
});

test('extract: an untraceable `q` callback column must exist somewhere', () => {
  const root = repo({ 'lib/d.ts': `count((q) => q.eq('origin', 'owner'));` });
  assert.deepEqual(keys(extract(root)), ['c:null.origin']);
  assert.match(
    missingReason(extract(root)[0], {
      tables: new Map([['businesses', new Set(['id'])]]),
      allColumns: new Set(['id']),
      fns: new Map(),
    }),
    /exists on no table/,
  );
});

const ref = (r) => ({ at: 'lib/x.ts:1', ...r });

test('decide: a new reference production lacks, with no migration -> block', () => {
  const r = decide({
    headRefs: [ref({ kind: 'column', table: 'businesses', column: 'origin' })],
    baseRefs: [],
    schema: SCHEMA,
    addedMigrationsSql: '',
    baseMigrationVersions: ['001', '002'],
  });
  assert.equal(r.ok, false);
  assert.match(r.blockers[0].reason, /businesses\.origin/);
});

test('decide: created by the PR’s own migration on a healthy pipeline -> pass', () => {
  const r = decide({
    headRefs: [ref({ kind: 'column', table: 'businesses', column: 'origin' })],
    baseRefs: [],
    schema: SCHEMA,
    addedMigrationsSql: 'ALTER TABLE businesses ADD COLUMN origin text;',
    baseMigrationVersions: ['001', '002'],
  });
  assert.equal(r.ok, true);
  assert.equal(r.covered.length, 1);
});

test('decide: …but production behind main -> block (the 2026-10 incident)', () => {
  const r = decide({
    headRefs: [ref({ kind: 'column', table: 'businesses', column: 'origin' })],
    baseRefs: [],
    schema: SCHEMA,
    addedMigrationsSql: 'ALTER TABLE businesses ADD COLUMN origin text;',
    baseMigrationVersions: ['001', '002', '003'],
  });
  assert.equal(r.ok, false);
  assert.deepEqual(r.backlog, ['003']);
  assert.match(r.blockers[0].reason, /1 migration\(s\) behind main/);
});

test('decide: rpc called with an argument production’s function lacks -> block', () => {
  const ok = decide({
    headRefs: [ref({ kind: 'rpc', fn: 'nearby', args: ['lat', 'lng'] })],
    baseRefs: [],
    schema: SCHEMA,
    addedMigrationsSql: '',
    baseMigrationVersions: [],
  });
  assert.equal(ok.ok, true, 'page_size has a default');
  const bad = decide({
    headRefs: [
      ref({ kind: 'rpc', fn: 'nearby', args: ['lat', 'lng', 'claimed_only'] }),
    ],
    baseRefs: [],
    schema: SCHEMA,
    addedMigrationsSql: '',
    baseMigrationVersions: [],
  });
  assert.equal(bad.ok, false);
  const missingRequired = decide({
    headRefs: [ref({ kind: 'rpc', fn: 'nearby', args: ['lat'] })],
    baseRefs: [],
    schema: SCHEMA,
    addedMigrationsSql: '',
    baseMigrationVersions: [],
  });
  assert.equal(missingRequired.ok, false, 'lng has no default');
});

test('decide: gaps already on main warn but do not block', () => {
  const old = ref({ kind: 'table', table: 'featured_deals' });
  const r = decide({
    headRefs: [old],
    baseRefs: [old],
    schema: SCHEMA,
    addedMigrationsSql: '',
    baseMigrationVersions: [],
  });
  assert.equal(r.ok, true);
  assert.equal(r.warnings.length, 1);
});

test('decide: production unreadable blocks only PRs that add references or migrations', () => {
  const none = decide({
    headRefs: [],
    baseRefs: [],
    schema: null,
    addedMigrationsSql: '',
    baseMigrationVersions: [],
  });
  assert.equal(none.ok, true);
  const adds = decide({
    headRefs: [ref({ kind: 'table', table: 'coupons' })],
    baseRefs: [],
    schema: null,
    addedMigrationsSql: '',
    baseMigrationVersions: [],
  });
  assert.equal(adds.ok, false);
  const migrates = decide({
    headRefs: [],
    baseRefs: [],
    schema: null,
    addedMigrationsSql: 'CREATE TABLE x();',
    baseMigrationVersions: [],
  });
  assert.equal(migrates.ok, false);
});
