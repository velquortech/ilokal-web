// Pure decisions for the daily migration health check (no I/O — see run.mjs).
//
// Why it exists: SUPABASE_ACCESS_TOKEN died somewhere between 2026-08-30 and
// 2026-10-09 while nothing deployed, so nothing failed and nobody knew. The
// deploy-failure workflow (#98) reports a deploy that fails; this reports the
// state of production every day, whether or not anything deployed.

import { createHash } from 'node:crypto';

/** Grace for a just-merged migration: its normal deploy may still be running. */
export const GRACE_MS = 2 * 60 * 60 * 1000;

/**
 * What a Supabase Management API status says about the token. Only 401/403
 * blame the token; anything else (5xx, timeout) proves nothing either way.
 * @param {number} status
 * @returns {'ok' | 'invalid' | 'unavailable'}
 */
export function classifyToken(status) {
  if (status === 200 || status === 201) return 'ok';
  if (status === 401 || status === 403) return 'invalid';
  return 'unavailable';
}

/**
 * Migrations on main that production lacks.
 * @param {{ version: string, addedAt: number }[]} local  main's migrations
 * @param {string[]} cloud  versions in production's schema_migrations
 * @param {number} now
 */
export function findBacklog(local, cloud, now, graceMs = GRACE_MS) {
  const onCloud = new Set(cloud);
  const onMain = new Set(local.map((m) => m.version));
  const missing = local.filter((m) => !onCloud.has(m.version));
  return {
    pending: missing
      .filter((m) => now - m.addedAt >= graceMs)
      .map((m) => m.version)
      .sort(),
    recent: missing
      .filter((m) => now - m.addedAt < graceMs)
      .map((m) => m.version)
      .sort(),
    cloudOnly: cloud.filter((v) => !onMain.has(v)).sort(),
  };
}

/**
 * What to do with each check's issue: open/update it ('problem'), close it
 * ('healthy'), or leave it as it is ('unknown' — we couldn't tell).
 * @param {{ token: 'ok'|'invalid'|'unavailable', backlog: ReturnType<typeof findBacklog> | null }} r
 */
export function decide({ token, backlog }) {
  if (token === 'invalid') return { token: 'problem', backlog: 'unknown' };
  if (token === 'unavailable' || !backlog) {
    return {
      token: token === 'ok' ? 'healthy' : 'unknown',
      backlog: 'unknown',
    };
  }
  return {
    token: 'healthy',
    backlog: backlog.pending.length > 0 ? 'problem' : 'healthy',
  };
}

/** A short fingerprint of a problem, so an open issue is only re-commented when it changes. */
export function stateOf(value) {
  return createHash('sha256')
    .update(JSON.stringify(value))
    .digest('hex')
    .slice(0, 12);
}
