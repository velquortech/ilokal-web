/**
 * pull-live.sh / check-pull-live.sh contract.
 *
 * The live→local snapshot script can regress in ways that are SILENT in the
 * default CI posture: the end-to-end `Pull-live-check` job needs live
 * credentials (SUPABASE_DB_URL + SUPABASE_SERVICE_ROLE_KEY), which this repo
 * does not configure — so on a normal PR the job SKIPS (exit 0) and a script
 * regression (tab escaping, restore order, kong handling, a verification
 * block that stops asserting) would sail through CI green. This suite pins the
 * verification invariants at the SOURCE level, the same way the sibling
 * `error-log-funnels` and `csp-dev-image-origin` suites pin theirs, so the
 * regression fails in the always-on unit-test job with or without secrets.
 *
 * What it pins:
 *   - pull-live.sh's verification block must FAIL (exit 1) when counts drift,
 *     and must print the two banners check-pull-live.sh greps for — a rename
 *     on either side breaks this contract instead of silently de-syncing.
 *   - check-pull-live.sh must assert BOTH banners (success + table comparison)
 *     against the SCRATCH container, and must keep the scratch teardown trap.
 *   - The read-only-live guarantee (never writes to live) stays structural.
 *   - The Makefile target and the CI job stay wired, so the check can't be
 *     silently removed from the pipeline either.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = join(__dirname, '../..');
const read = (relative: string) => readFileSync(join(ROOT, relative), 'utf8');

const pullLive = read('supabase/scripts/pull-live.sh');
const checkPullLive = read('supabase/scripts/check-pull-live.sh');
const makefile = read('Makefile');
const workflow = read('.github/workflows/pull-request-workflow.yml');

/**
 * Strip comments before "this string must not appear" sweeps. The scripts
 * deliberately EXPLAIN the verification by name; a sweep that fails on its
 * own explanation teaches the next person to delete the explanation.
 */
const stripComments = (source: string) => source.replace(/#.*$/gm, '');

describe('pull-live.sh verification block', () => {
  it('fails the pull when counts drift from live (exit 1)', () => {
    // The whole point of the verify step: a mismatched local DB must be a
    // loud failure, not a "completed" pull with drifted rows.
    expect(pullLive).toContain('FAIL=1');
    expect(pullLive).toMatch(/if \[ "\$FAIL" = 1 \]; then/);
    expect(pullLive).toMatch(/write_report "MISMATCH"/);
    expect(pullLive).toMatch(/exit 1/);
  });

  it('prints the exact success banner check-pull-live.sh greps for', () => {
    // The check greps for these literal lines. If pull-live.sh renames or
    // reformats them without the check following, the check silently greps
    // for nothing and still passes — so pin both sides here.
    expect(pullLive).toContain(
      'echo "✓ Live snapshot loaded into local \'$CONTAINER\'."',
    );
    expect(pullLive).toContain(
      'echo "  - public tables: identical to live ($(wc -l < /tmp/pull-live-live-counts.txt) tables)"',
    );
  });

  it('keeps the read-only-live guarantee structural', () => {
    // Live access is pg_dump / SELECT / COPY-TO-STDOUT only. Every live touch
    // must be a read; the writes go to the LOCAL container.
    expect(pullLive).toContain('pg_dump "$LIVE_DB_URL"');
    expect(pullLive).toContain('psql "$LIVE_DB_URL" -tA');
    expect(pullLive).toContain('COPY public.spatial_ref_sys TO STDOUT');
    // No live write primitives in the non-dry-run path.
    expect(stripComments(pullLive)).not.toMatch(
      /psql "$LIVE_DB_URL"[^\n]*UPDATE|psql "$LIVE_DB_URL"[^\n]*DELETE|psql "$LIVE_DB_URL"[^\n]*INSERT/,
    );
  });
});

describe('check-pull-live.sh assertions', () => {
  it('asserts the success banner names the SCRATCH container', () => {
    expect(checkPullLive).toContain(
      'grep -F "✓ Live snapshot loaded into local \'supabase_db_${SCRATCH_PROJECT}\'."',
    );
  });

  it('asserts the verification compared live tables (did not skip)', () => {
    // The banner alone could pass while the counts comparison was deleted;
    // the check must require the "identical to live" line too.
    expect(checkPullLive).toContain(
      'grep -F "public tables: identical to live" /tmp/ilokal-pull-live-check-pull.log >/dev/null',
    );
  });

  it('fails the check (exit 1) when either assertion does not match', () => {
    expect(checkPullLive).toContain('exit 1');
    expect(checkPullLive).toContain('✗ verification block did not pass');
    expect(checkPullLive).toContain(
      '✗ verification block did not compare live tables',
    );
  });

  it('keeps the scratch teardown trap', () => {
    expect(checkPullLive).toContain("trap 'teardown' EXIT");
    expect(checkPullLive).toContain('supabase --workdir "$SCRATCH" stop');
  });
});

describe('wiring survives (the check cannot be silently removed)', () => {
  it('keeps the Makefile target', () => {
    expect(makefile).toMatch(
      /^pull-live-check:\n\t@bash supabase\/scripts\/check-pull-live\.sh$/m,
    );
  });

  it('keeps the CI job calling it', () => {
    expect(workflow).toContain('Pull-live-check:');
    expect(workflow).toContain('make pull-live-check');
  });

  it('keeps the CI job gated on the live secret so a missing credential is a visible SKIP, not a green pass', () => {
    // Without this gate, the job runs, finds no .env.cloud, prints SKIP and
    // exits 0 — a green check that never exercised the script.
    //
    // Job-level `if` cannot read the `secrets` or `env` contexts (GitHub's
    // parser rejects both), so the workflow must surface the secret's
    // presence through a probe job output and gate on `needs` — the only
    // supported way to skip a job on a secret. Pin all three pieces: the
    // probe job output, the `needs` wiring, and the gate expression. Also
    // reject the two historically-tried-but-invalid direct forms so a future
    // edit can't "simplify" back into a workflow that fails to parse.
    expect(workflow).toMatch(/Pull-live-credentials:/);
    expect(workflow).toMatch(
      /has_credentials: \$\{\{ steps\.check\.outputs\.has_credentials \}\}/,
    );
    expect(workflow).toMatch(/needs: \[Setup, Pull-live-credentials\]/);
    expect(workflow).toMatch(
      /if: \$\{\{ needs\.Pull-live-credentials\.outputs\.has_credentials == 'true' \}\}/,
    );
    expect(workflow).not.toMatch(/if: \$\{\{ (env\.|secrets\.)SUPABASE_DB_URL/);
  });
});
