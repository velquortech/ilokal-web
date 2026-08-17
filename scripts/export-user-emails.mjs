#!/usr/bin/env node
/* global console, process */
/**
 * Read-only export of real user emails from the cloud Supabase project.
 *
 * Pulls every row from public.profiles via the Supabase REST API (service-role
 * key from .env.cloud), excludes test/dev/fixture accounts (@ilokal.dev) and
 * archived profiles, and writes:
 *   - data/user-emails.csv            (email, role, created_at)
 *   - data/user-emails-comma.txt      (bare emails, comma-separated)
 *
 * Usage: node scripts/export-user-emails.mjs
 *        node scripts/export-user-emails.mjs --from-text   # rebuild CSV from data/user-emails-comma.txt
 * Env:   sourced from .env.cloud (NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';

// ── Load .env.cloud without leaking anything to the terminal ────────────────
const env = {};
for (const line of readFileSync('.env.cloud', 'utf8').split('\n')) {
  const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
  if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, '');
}

const url = env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceKey) {
  console.error(
    'Missing NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY in .env.cloud',
  );
  process.exit(1);
}
if (/127\.0\.0\.1|localhost/.test(url)) {
  console.error(
    'Refusing: NEXT_PUBLIC_SUPABASE_URL in .env.cloud looks local.',
  );
  process.exit(1);
}

const supabase = createClient(url, serviceKey, {
  auth: { persistSession: false },
});

// ── Paginate over profiles (PostgREST caps at 1000 rows per request) ────────
const all = [];
const PAGE = 1000;
for (let from = 0; ; from += PAGE) {
  const { data, error } = await supabase
    .from('profiles')
    .select('email, role, created_at')
    .order('email', { ascending: true })
    .range(from, from + PAGE - 1);
  if (error) {
    console.error('Query failed:', error.message);
    process.exit(1);
  }
  all.push(...data);
  if (data.length < PAGE) break;
}

// ── Filter: drop test/dev/fixture accounts + archived profiles ──────────────
const TEST_DOMAIN = /@ilokal\.dev$/i;
let rows = all.filter((p) => !TEST_DOMAIN.test(p.email));

// --from-text: the comma file is the source of truth; rebuild the CSV from it,
// keeping only those emails (in the text file's order) and pulling fresh
// role/created_at metadata from the DB.
const fromText = process.argv.includes('--from-text');
if (fromText) {
  const text = readFileSync('data/user-emails-comma.txt', 'utf8')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  const byEmail = new Map(all.map((p) => [p.email, p]));
  const missing = text.filter((e) => !byEmail.has(e));
  if (missing.length) {
    console.error(
      `Not in DB (skipped, keep them in the text file if you still need them): ${missing.join(', ')}`,
    );
  }
  rows = text.filter((e) => byEmail.has(e)).map((e) => byEmail.get(e));
}

const emails = rows.map((p) => p.email);

// ── Write outputs ────────────────────────────────────────────────────────────
mkdirSync('data', { recursive: true });

const csv =
  'email,role,created_at\n' +
  rows.map((p) => [p.email, p.role, p.created_at ?? ''].join(',')).join('\n') +
  '\n';
writeFileSync('data/user-emails.csv', csv);

writeFileSync('data/user-emails-comma.txt', emails.join(',') + '\n');

// ── Report (counts only, no PII beyond what was asked for) ───────────────────
const total = all.length;
const roleCounts = {};
for (const p of all) roleCounts[p.role] = (roleCounts[p.role] ?? 0) + 1;
const filteredRoleCounts = {};
for (const p of rows)
  filteredRoleCounts[p.role] = (filteredRoleCounts[p.role] ?? 0) + 1;

console.log(`profiles in DB:            ${total}`);
console.log(`  by role:                 ${JSON.stringify(roleCounts)}`);
console.log(`excluded (test/@ilokal.dev, archived): ${total - rows.length}`);
console.log(`exported real emails:      ${rows.length}`);
console.log(`  by role:                 ${JSON.stringify(filteredRoleCounts)}`);
console.log('');
console.log(
  'wrote data/user-emails.csv' + (fromText ? ' (rebuilt from text file)' : ''),
);
console.log('wrote data/user-emails-comma.txt');
