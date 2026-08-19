import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Contract sweep over the whole upload surface.
 *
 * The gap this closes was not "someone wrote a bad route" — it was that
 * `/api/web` is absent from the proxy matcher, so an upload route is
 * unthrottled BY DEFAULT and nothing says so at review time. A per-file guard
 * would be re-forgotten by the eighth route; this sweep discovers routes from
 * the filesystem, so a new one fails until it is guarded.
 */
const UPLOAD_DIR = join(process.cwd(), 'app/api/web/upload');

/** Every `route.ts` under the upload directory, found rather than listed. */
function findRoutes(dir: string): string[] {
  const found: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === '__tests__') continue;
      found.push(...findRoutes(full));
    } else if (entry.name === 'route.ts' || entry.name === 'route.tsx') {
      found.push(full);
    }
  }
  return found;
}

/**
 * Comments are stripped before every assertion. These routes explain the trap
 * they avoid and name the helper in prose, so a sweep that read comments would
 * pass on an explanation alone — and would teach the next person to delete the
 * explanation to make the test honest.
 */
function stripComments(src: string): string {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:])\/\/.*$/gm, '$1');
}

const routes = findRoutes(UPLOAD_DIR);

describe('upload rate-limit contract', () => {
  it('finds the upload routes it is meant to guard', () => {
    // A sweep that silently matches nothing is the failure mode it exists to
    // catch, so assert it actually looked at something.
    expect(routes.length).toBeGreaterThanOrEqual(7);
  });

  it.each(routes)('%s imports the shared helper', (file) => {
    const src = stripComments(readFileSync(file, 'utf8'));
    expect(src).toMatch(
      /import\s*\{[^}]*checkUploadRateLimit[^}]*\}\s*from\s*'@\/app\/api\/helpers\/upload-rate-limit'/,
    );
  });

  it.each(routes)('%s calls the guard and returns its 429', (file) => {
    const src = stripComments(readFileSync(file, 'utf8'));
    expect(src).toMatch(/checkUploadRateLimit\(/);
    // The guard is only a guard if its result is returned.
    expect(src).toMatch(/if\s*\(\s*limited\s*\)\s*return\s+limited\s*;/);
  });

  /**
   * The placement assertion — the one that decides whether the guard is worth
   * anything. `request.formData()` buffers the whole 2–4 MB body and the sharp
   * re-encode runs after it, so a guard placed later throttles the response
   * without preventing the cost.
   */
  it.each(routes.filter((f) => readFileSync(f, 'utf8').includes('formData()')))(
    '%s guards before it buffers the request body',
    (file) => {
      const src = stripComments(readFileSync(file, 'utf8'));
      const guardAt = src.indexOf('checkUploadRateLimit(');
      const formDataAt = src.indexOf('request.formData()');

      expect(guardAt).toBeGreaterThan(-1);
      expect(formDataAt).toBeGreaterThan(-1);
      expect(guardAt).toBeLessThan(formDataAt);
    },
  );

  /**
   * Keying on a client-supplied id would let a caller rotate it for free
   * budget. The avatar route reads a `userId` form field for admin edits, so
   * this is a live hazard, not a hypothetical one.
   */
  it.each(routes)('%s keys the guard on the verified session user', (file) => {
    const src = stripComments(readFileSync(file, 'utf8'));
    const calls = src.match(/checkUploadRateLimit\(([^)]*)\)/g) ?? [];

    expect(calls.length).toBeGreaterThan(0);
    for (const call of calls) {
      expect(call).toMatch(/checkUploadRateLimit\(\s*auth\.user\??\.id\s*\)/);
    }
  });

  /**
   * `verifyBusinessOwner` types `user` as OPTIONAL even though every success
   * path populates it, so those five routes must refuse an authorized result
   * carrying no id rather than letting it reach the guard. (The two
   * `assertAuthorized` routes need no such check — that helper narrows
   * `auth.user`, so the id is non-optional there.)
   *
   * Asserted rather than left to convention: without this, the check can be
   * deleted from all five and every other test still passes.
   */
  it.each(
    // Scoped by the helper the route GATES on, not merely calls: the DELETE
    // route gates on `assertAuthorized` and also calls `verifyBusinessOwner`
    // for per-bucket ownership, so filtering on the call alone wrongly demands
    // a check it does not need.
    routes.filter((f) => !readFileSync(f, 'utf8').includes('assertAuthorized')),
  )('%s refuses an authorized result with no user id', (file) => {
    const src = stripComments(readFileSync(file, 'utf8'));
    expect(src).toMatch(/if\s*\(\s*!auth\??\.user\?\.id\s*\)/);
  });

  it('routes share one bucket rather than declaring their own budgets', () => {
    // A route minting its own limit would re-open the rotate-between-doors
    // hole the single namespace exists to close.
    for (const file of routes) {
      const src = stripComments(readFileSync(file, 'utf8'));
      expect(src).not.toMatch(/rateLimit\(\s*`/);
      expect(src).not.toMatch(/WEB_UPLOAD_RATE_LIMIT/);
    }
  });
});
