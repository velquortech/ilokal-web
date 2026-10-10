/**
 * check-seed-freshness.sh contract.
 *
 * The freshness invariant (PR #88: zero published seed-family coupons may be
 * expired after a fresh seed; extended by PR #90 to the playtest fixtures) is
 * enforced at RUNTIME by check-seed-freshness.sh against a scratch stack, but
 * that runtime job needs docker — so on a CI runner it either runs (job gated
 * on docker) or never starts. Same silent-regression posture as
 * pull-live-check: an edit that weakens the invariant's SQL (e.g. drops the
 * `f2000000%` family, or stops the check from failing on violations) would
 * sail through unchanged until a dev DB actually drifts. This suite pins the
 * invariants at the SOURCE level — the same way the sibling pull-live-script
 * contract does — so the regression fails in the always-on unit-test job.
 *
 * What it pins:
 *   - the violation SQL filters status='published' AND expiry_date <= NOW()
 *     against BOTH seed id families (44444444% + f2000000%), and exits 1 when
 *     anything violates, printing the offending rows;
 *   - the vacuous-invariant guard (no seed-family rows ⇒ fail, not pass) so
 *     an empty-seed regression cannot masquerade as a green freshness pass;
 *   - the scratch stack stays the SAME pattern as pull-live's (own project_id,
 *     ports bumped +1000, dev stack never the target, teardown trap intact);
 *   - Makefile target + CI workflow stay wired, so the check cannot be
 *     silently removed from the pipeline.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = join(__dirname, '../..');
const read = (relative: string) => readFileSync(join(ROOT, relative), 'utf8');

const check = read('supabase/scripts/check-seed-freshness.sh');
const refresh = read('supabase/seeds/refresh_freshness.sql');
const makefile = read('Makefile');
const workflow = read('.github/workflows/pull-request-workflow.yml');

describe('check-seed-freshness.sh invariant', () => {
  it('violations SQL filters published + expired, not merely published', () => {
    // Weaker variants (any status — would count drafts; any expiry — would
    // count upcoming) make the check meaningless. Pin the exact semantics.
    expect(check).toContain("status = 'published'");
    expect(check).toMatch(/expiry_date <= NOW\(\)/);
  });

  it('covers BOTH seed id families, matching refresh_freshness.sql', () => {
    // If a family is added to refresh_freshness.sql but not here (or vice
    // versa), a seed the runtime check never asserts can drift. Pin the
    // pairing so the two move together.
    expect(check).toContain("'44444444%'");
    expect(check).toContain("'f2000000%'");
    expect(refresh).toContain("'44444444%'");
    expect(refresh).toContain("'f2000000%'");
  });

  it('exits 1 on violation and PRINTS the offending rows', () => {
    // The whole value in CI: the failure names code + expiry + id so the fix
    // is obvious from the log alone.
    expect(check).toMatch(/seed-freshness invariant VIOLATED/);
    expect(check).toMatch(/exit 1/);
    // The SELECT that feeds $VIOLATIONS returns code | expiry | id:
    expect(check).toMatch(/SELECT code \|\|/);
  });

  it('guards the vacuous pass (no seed-family rows ⇒ fail, not pass)', () => {
    expect(check).toMatch(/vacuous invariant/);
    expect(check).toMatch(/-eq 0/);
  });

  it('keeps the scratch-stack isolation pattern (dev stack never the target)', () => {
    // Own project_id + +1000 port offset + teardown trap, exactly like
    // check-pull-live.sh. A regression that resets the dev stack directly
    // would destroy the developer's working data on every run.
    expect(check).toContain('ilokal-web-seedcheck');
    expect(check).toMatch(/BASE=5432/);
    expect(check).toMatch(/OFFSET=55|OFFport 55|5542|5532/);
    expect(check).toMatch(/trap 'teardown' EXIT/);
    expect(check).not.toMatch(/supabase_db_ilokal-web'/); // never touch dev DB container
  });

  it('is wired into the Makefile and the CI workflow', () => {
    expect(makefile).toMatch(/seed-freshness-check:/);
    expect(makefile).toContain('supabase/scripts/check-seed-freshness.sh');
    expect(workflow).toMatch(/seed-freshness-check/);
  });
});
