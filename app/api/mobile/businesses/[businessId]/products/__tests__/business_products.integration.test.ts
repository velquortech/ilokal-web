/**
 * `business_products` RPC projection — REAL-DB guard.
 *
 * The route unit test (`route.test.ts`) mocks supabase, so it can't see the
 * SQL that actually runs. This test shells into the local dockerized Supabase
 * Postgres and asserts the live function's contract — the thing a future
 * refactor could silently break:
 *
 *  1. the RETURNS TABLE still projects `weekly_view_count` (the mobile scan's
 *     primary trend signal; a drop collapses the flag-off Bida board to 0s);
 *  2. `popularity` is views-led — the productTrendScore mirror from
 *     `20260814150000_business_products_views.sql` (weekly views lead, rating
 *     proxy fallback) — NOT the old ratings-only formula. Proven functionally:
 *     a controlled product with views = 777 and no ratings rows must come back
 *     with `popularity = 777` (the ratings-only formula would yield 0).
 *
 * Skips when the local DB container isn't running (CI has no docker, and this
 * repo has no pg client — the app goes through PostgREST). Run locally via
 * `yarn test:integration` or the default `vitest` with the supabase stack up.
 */

import { describe, it, expect } from 'vitest';
import { execFileSync } from 'node:child_process';

const DB_CONTAINER = 'supabase_db_ilokal-web';
const DB_USER = 'postgres';
const DB_NAME = 'postgres';

function psql(sql: string): string {
  return execFileSync(
    'docker',
    [
      'exec',
      DB_CONTAINER,
      'psql',
      '-U',
      DB_USER,
      '-d',
      DB_NAME,
      '-t',
      '-A',
      '-c',
      sql,
    ],
    { encoding: 'utf8', timeout: 15_000 },
  ).trim();
}

function dbUp(): boolean {
  try {
    psql('SELECT 1');
    return true;
  } catch {
    return false;
  }
}

describe.skipIf(!dbUp())('business_products RPC projection (local DB)', () => {
  it('projects weekly_view_count in the function signature', () => {
    const result = psql(
      "SELECT pg_get_function_result('public.business_products(uuid)'::regprocedure)",
    );
    expect(result).toContain('weekly_view_count');
  });

  it('keeps popularity views-led in the function body (weekly views lead, rating proxy fallback)', () => {
    const def = psql(
      "SELECT pg_get_functiondef('public.business_products(uuid)'::regprocedure)",
    );
    // The views-led CASE from 20260814150000_business_products_views.sql.
    expect(def).toContain('WHEN p.weekly_view_count IS NOT NULL');
    expect(def).toContain('THEN p.weekly_view_count::double precision');
  });

  it('returns popularity equal to weekly views on real data — not the ratings-only formula', () => {
    // Insert a controlled product (777 views, NO ratings rows — the old
    // ratings-only formula would score it 0), read it back through the live
    // RPC, then roll back so the DB is untouched.
    const out = psql(`
      BEGIN;
      INSERT INTO products (id, business_id, name, price, weekly_view_count)
      SELECT '99999999-9999-4999-8999-999999999999', id, 'rpc-projection-test', 100, 777
      FROM businesses
      WHERE status = 'verified'
      LIMIT 1;
      SELECT weekly_view_count || '|' || popularity
      FROM public.business_products(
        (SELECT business_id FROM products WHERE id = '99999999-9999-4999-8999-999999999999')
      )
      WHERE id = '99999999-9999-4999-8999-999999999999';
      ROLLBACK;
    `);
    const line = out.split('\n').find((l) => l.startsWith('777|'));
    expect(line).toBe('777|777');
  });
});
