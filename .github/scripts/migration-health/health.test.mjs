// node --test .github/scripts/migration-health/health.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { classifyToken, findBacklog, decide, stateOf } from './health.mjs';

const HOUR = 3_600_000;
const NOW = Date.parse('2026-10-12T01:00:00Z');

test('a 401/403 means the token itself is rejected', () => {
  assert.equal(classifyToken(200), 'ok');
  assert.equal(classifyToken(201), 'ok');
  assert.equal(classifyToken(401), 'invalid');
  assert.equal(classifyToken(403), 'invalid');
  // Supabase being down is not the token's fault — and not proof it works.
  assert.equal(classifyToken(500), 'unavailable');
  assert.equal(classifyToken(0), 'unavailable');
});

test('a migration on main that cloud lacks is a backlog', () => {
  const local = [
    { version: '20260827000000', addedAt: NOW - 60 * 24 * HOUR },
    { version: '20260901000000', addedAt: NOW - 40 * HOUR },
  ];
  const { pending, recent, cloudOnly } = findBacklog(
    local,
    ['20260827000000'],
    NOW,
  );
  assert.deepEqual(pending, ['20260901000000']);
  assert.deepEqual(recent, []);
  assert.deepEqual(cloudOnly, []);
});

test('a migration merged within the grace window is not yet a backlog', () => {
  // The normal deploy may still be running for something merged minutes ago.
  const { pending, recent } = findBacklog(
    [{ version: '20261012000000', addedAt: NOW - 30 * 60_000 }],
    [],
    NOW,
  );
  assert.deepEqual(pending, []);
  assert.deepEqual(recent, ['20261012000000']);
});

test('versions on cloud but not on main are reported as drift', () => {
  const { cloudOnly } = findBacklog(
    [{ version: '20260827000000', addedAt: NOW - 99 * HOUR }],
    ['20260827000000', '20260901000000'],
    NOW,
  );
  assert.deepEqual(cloudOnly, ['20260901000000']);
});

test('decide: an invalid token opens the token issue and leaves the backlog alone', () => {
  const d = decide({ token: 'invalid', backlog: null });
  assert.deepEqual(d, { token: 'problem', backlog: 'unknown' });
});

test('decide: a valid token with a backlog closes the token issue and opens the backlog one', () => {
  const d = decide({
    token: 'ok',
    backlog: { pending: ['20260901000000'], recent: [], cloudOnly: [] },
  });
  assert.deepEqual(d, { token: 'healthy', backlog: 'problem' });
});

test('decide: everything applied closes both', () => {
  const d = decide({
    token: 'ok',
    backlog: { pending: [], recent: ['20261012000000'], cloudOnly: [] },
  });
  assert.deepEqual(d, { token: 'healthy', backlog: 'healthy' });
});

test('decide: Supabase unreachable changes nothing (no false alarm, no false all-clear)', () => {
  assert.deepEqual(decide({ token: 'unavailable', backlog: null }), {
    token: 'unknown',
    backlog: 'unknown',
  });
});

test('the issue only needs a new comment when the problem changes', () => {
  const a = stateOf({ pending: ['20260901000000'], cloudOnly: [] });
  const b = stateOf({ pending: ['20260901000000'], cloudOnly: [] });
  const c = stateOf({
    pending: ['20260901000000', '20261001000000'],
    cloudOnly: [],
  });
  assert.equal(a, b);
  assert.notEqual(a, c);
});
