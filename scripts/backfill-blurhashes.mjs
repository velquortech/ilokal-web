#!/usr/bin/env node
/* global console, process, Buffer */
/**
 * Backfill BlurHash placeholders for shop logos and gallery photos uploaded
 * before `uploadWebP` started recording them (migration 20260901000000).
 *
 *   node scripts/backfill-blurhashes.mjs            # LOCAL stack (.env)
 *   node scripts/backfill-blurhashes.mjs --cloud    # CLOUD project (.env.cloud)
 *   node scripts/backfill-blurhashes.mjs --limit 20 # cap, for a smoke test
 *
 * Idempotent: images that already have a hash are skipped, so it is safe to
 * re-run after a partial failure. Needs NEXT_PUBLIC_SUPABASE_URL and
 * SUPABASE_SERVICE_ROLE_KEY. Reads each object with the service role and never
 * writes to storage.
 *
 * The encoder is the app's own `lib/utils/blurhash.ts`, loaded through Node's
 * built-in TypeScript type stripping (Node ≥ 22.18 / 23.6) — one encoder for
 * uploads and backfill, no extra dependency.
 */
import { readFileSync } from 'node:fs';
import sharp from 'sharp';
import { createClient } from '@supabase/supabase-js';
import { encodeBlurhash } from '../lib/utils/blurhash.ts';

const args = process.argv.slice(2);
const CLOUD = args.includes('--cloud');
const limitArg = args.indexOf('--limit');
const LIMIT = limitArg >= 0 ? Number(args[limitArg + 1]) : Infinity;
const CONCURRENCY = 4;

const log = (...m) => console.log(...m);
function fail(message) {
  console.error(`✗ ${message}`);
  process.exit(1);
}

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
  // Same two-way guard as import-directory.mjs.
  if (CLOUD && isLocal) fail(`--cloud given but ${file} points at a local URL`);
  if (!CLOUD && !isLocal) fail(`${file} points at a remote URL. Pass --cloud to mean it.`);
  log(`target: ${isLocal ? 'LOCAL' : 'CLOUD'}`);
  return createClient(url, key, { auth: { persistSession: false } });
}

/** Mirrors lib/utils/storage.ts → extractStoragePath (paths or legacy URLs). */
function storagePath(pathOrUrl, bucket) {
  if (!pathOrUrl) return null;
  let path = pathOrUrl;
  if (pathOrUrl.startsWith('http')) {
    const marker = `/storage/v1/object/public/${bucket}/`;
    const idx = pathOrUrl.indexOf(marker);
    if (idx === -1) return null; // an external URL, not one of our objects
    path = pathOrUrl.slice(idx + marker.length);
  }
  if (!/%[0-9A-Fa-f]{2}/.test(path)) return path;
  try {
    return decodeURIComponent(path);
  } catch {
    return path;
  }
}

async function blurhashOf(supabase, bucket, path) {
  const { data, error } = await supabase.storage.from(bucket).download(path);
  if (error) throw new Error(`download failed: ${error.message}`);
  const image = Buffer.from(await data.arrayBuffer());
  const { data: px, info } = await sharp(image, { pages: 1 })
    .resize(32, 32, { fit: 'inside' })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  return encodeBlurhash(new Uint8Array(px), info.width, info.height);
}

async function main() {
  const supabase = connect();

  const { data: businesses, error } = await supabase
    .from('businesses')
    .select('id, logo_url, interior_images')
    .is('archived_at', null);
  if (error) fail(`Could not read businesses: ${error.message}`);

  const refs = [];
  for (const b of businesses) {
    const logo = storagePath(b.logo_url, 'shop-logos');
    if (logo) refs.push({ bucket: 'shop-logos', path: logo });
    for (const img of b.interior_images ?? []) {
      const path = storagePath(img, 'interior-images');
      if (path) refs.push({ bucket: 'interior-images', path });
    }
  }

  const { data: existing, error: existingError } = await supabase
    .from('image_blurhashes')
    .select('bucket, path');
  if (existingError) fail(`Could not read image_blurhashes: ${existingError.message}`);
  const have = new Set(existing.map((r) => `${r.bucket}/${r.path}`));
  const pending = refs.filter((r) => !have.has(`${r.bucket}/${r.path}`));
  const todo = pending.slice(0, LIMIT);

  log(
    `${refs.length} images: ${refs.length - pending.length} already hashed, ` +
      `${todo.length} to do`,
  );

  let done = 0;
  let failed = 0;
  for (let i = 0; i < todo.length; i += CONCURRENCY) {
    await Promise.all(
      todo.slice(i, i + CONCURRENCY).map(async ({ bucket, path }) => {
        try {
          const blurhash = await blurhashOf(supabase, bucket, path);
          const { error: upsertError } = await supabase
            .from('image_blurhashes')
            .upsert({ bucket, path, blurhash }, { onConflict: 'bucket,path' });
          if (upsertError) throw new Error(upsertError.message);
          done++;
        } catch (err) {
          failed++;
          console.error(`  ✗ ${bucket}/${path}: ${err.message}`);
        }
      }),
    );
  }

  log(`done: ${done} hashed, ${failed} failed`);
  if (failed > 0) process.exitCode = 1;
}

main();
