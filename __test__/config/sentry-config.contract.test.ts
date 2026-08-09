/**
 * Sentry setup contract.
 *
 * Asserted at the SOURCE level, for the same reason the sibling
 * `server-action-body-limit.contract.test.ts` is: `next.config.ts` is a
 * build-time module that reads env vars, and `sentry.server.config.ts` is
 * loaded only by `instrumentation.ts` at server boot. Importing either under
 * the node test environment would prove less than reading what they declare.
 *
 * Two classes of thing are pinned here:
 *
 *  1. What the Sentry wrap must not have eaten (SN10). `withSentryConfig`
 *     returns a new config object, and the welcome-post font tracing fails
 *     SILENTLY and only in production — it renders in the bundled Geist, i.e.
 *     off-brand, with no error anywhere. It had no test before this branch.
 *
 *  2. The privacy and transport decisions (SN4, SN6, SN9). The server DSN must
 *     never cross into the client bundle; browser events must keep going
 *     through the same-origin tunnel rather than a widened `connect-src`,
 *     because a direct-to-ingest install fails SILENTLY in production while
 *     appearing to work in dev; and the tunnel must stay rate-limited, since it
 *     is an unauthenticated POST that spends the event quota.
 */

import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { join } from 'node:path';

const ROOT = join(__dirname, '../..');
const read = (relative: string) => readFileSync(join(ROOT, relative), 'utf8');

/**
 * Strip comments before any "this string must not appear" sweep.
 *
 * These files deliberately NAME the thing they forbid — `sentry.server.config.ts`
 * explains at length why the DSN is not `NEXT_PUBLIC_SENTRY_DSN`. A sweep that
 * fails on its own explanation teaches the next person to delete the
 * explanation, which is the opposite of what it is for. Same approach as the
 * gallery and image-compression contract sweeps.
 */
const stripComments = (source: string) =>
  source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');

const nextConfig = read('next.config.ts');
const serverConfig = read('sentry.server.config.ts');
const edgeConfig = read('sentry.edge.config.ts');
const clientConfig = read('instrumentation-client.ts');
const instrumentation = read('instrumentation.ts');
const proxySource = read('proxy.ts');

describe('next.config.ts survives the Sentry wrap', () => {
  it('still exports through withSentryConfig', () => {
    expect(nextConfig).toMatch(
      /export default withSentryConfig\(\s*nextConfig/,
    );
  });

  it('keeps the welcome-post output file tracing', () => {
    // Silent in production if lost: the renderer falls back to the bundled
    // Geist and every generated post ships off-brand.
    expect(nextConfig).toMatch(/outputFileTracingIncludes/);
    expect(nextConfig).toMatch(/'\/api\/admin\/welcome-post'/);
    expect(nextConfig).toContain('./assets/fonts/**');
    expect(nextConfig).toContain('./public/brand/wordmark/**');
  });

  it('keeps the 3 MB Server Action body limit', () => {
    // Covered in its own suite too, but a wrap that dropped `experimental`
    // should fail here rather than only at the next 2 MB image upload.
    expect(nextConfig).toMatch(/bodySizeLimit:\s*'3mb'/);
  });

  it('does not serve source maps publicly', () => {
    expect(nextConfig).toMatch(/deleteSourcemapsAfterUpload:\s*true/);
  });

  it('does not set disableLogger', () => {
    // The build warns it is deprecated AND "Not supported with Turbopack",
    // which is what this repo builds with — so it does nothing except add a
    // warning to every build. Comments stripped: the config explains the trap
    // by name, and a sweep that fails on its own explanation gets the
    // explanation deleted.
    expect(stripComments(nextConfig)).not.toMatch(/disableLogger/);
  });
});

describe('all three runtimes are initialised', () => {
  it('has a config file per runtime', () => {
    expect(existsSync(join(ROOT, 'sentry.server.config.ts'))).toBe(true);
    expect(existsSync(join(ROOT, 'sentry.edge.config.ts'))).toBe(true);
    expect(existsSync(join(ROOT, 'instrumentation-client.ts'))).toBe(true);
    // The deprecated name for the client file; having both would init twice.
    expect(existsSync(join(ROOT, 'sentry.client.config.ts'))).toBe(false);
  });

  it('register() covers node and edge', () => {
    expect(instrumentation).toMatch(/NEXT_RUNTIME === 'nodejs'/);
    expect(instrumentation).toMatch(/sentry\.server\.config/);
    expect(instrumentation).toMatch(/NEXT_RUNTIME === 'edge'/);
    expect(instrumentation).toMatch(/sentry\.edge\.config/);
  });

  it('keeps the server-side DSN off the client', () => {
    // `SENTRY_DSN` has no NEXT_PUBLIC_ prefix, so it is server-only. The
    // browser reads its own `NEXT_PUBLIC_SENTRY_DSN`; the two must not be
    // crossed, or the server DSN is inlined into every visitor's bundle.
    // Comments stripped: these files name the variables in order to explain
    // the distinction.
    for (const source of [serverConfig, edgeConfig]) {
      expect(stripComments(source)).not.toMatch(/NEXT_PUBLIC_SENTRY_DSN/);
    }
    expect(stripComments(clientConfig)).not.toMatch(/process\.env\.SENTRY_DSN/);
  });

  it('no runtime passes release, which would clobber the injected one', () => {
    // The SDK spreads caller options LAST over its own defaults, so a `release`
    // key here wins even when its value is `undefined` — overwriting the
    // release the bundler injected, which is what the uploaded source maps are
    // keyed to. Comments stripped: each config explains the trap by name.
    for (const source of [serverConfig, edgeConfig, clientConfig]) {
      expect(stripComments(source)).not.toMatch(/^\s*release:/m);
    }
  });

  it('never sets environment unconditionally', () => {
    // Same spread order: an always-truthy `environment` overrides Vercel's own
    // detection and collapses preview deploys into production.
    for (const source of [serverConfig, edgeConfig]) {
      expect(stripComments(source)).not.toMatch(/^\s*environment:/m);
    }
    // The client keeps an override, but only when explicitly configured.
    expect(stripComments(clientConfig)).toMatch(
      /NEXT_PUBLIC_SENTRY_ENVIRONMENT\s*\n?\s*\?\s*\{\s*environment:/,
    );
  });

  it('every runtime scrubs and drops through the tested helpers', () => {
    for (const source of [serverConfig, edgeConfig, clientConfig]) {
      expect(source).toMatch(/from '@\/lib\/utils\/monitoring'/);
      expect(source).toMatch(/isExpectedError/);
      expect(source).toMatch(/sendDefaultPii:\s*false/);
      expect(source).toMatch(/enabled:\s*Boolean\(dsn\)/);
    }
  });
});

describe('the browser tunnel (SN4, SN9)', () => {
  it('is declared, and the CSP is therefore left alone', () => {
    expect(nextConfig).toMatch(/tunnelRoute:\s*'\/monitoring'/);
    // The whole point of the tunnel: connect-src keeps naming only first-party
    // and Supabase origins. A Sentry ingest host appearing here means someone
    // swapped strategy without removing the tunnel. Comments stripped — the
    // config names the rejected alternative in order to explain the choice.
    expect(stripComments(nextConfig)).not.toMatch(/ingest\.[a-z.]*sentry\.io/);
  });

  it('is rate-limited in the proxy before it forwards anything', () => {
    // An unauthenticated POST that forwards to Sentry is a free way to burn
    // the quota, and a spent quota drops real errors too.
    expect(proxySource).toMatch(/SENTRY_TUNNEL_PATH = '\/monitoring'/);
    expect(proxySource).toMatch(/sentry-tunnel:\$\{clientIp\(request\)\}/);
  });

  it('is in the proxy matcher, or that limit never runs', () => {
    const matcher = proxySource.slice(proxySource.indexOf('matcher: ['));
    expect(matcher).toMatch(/'\/monitoring'/);
  });
});

describe('the root error boundary (SN3, SN5)', () => {
  it('global-error.tsx exists and reports', () => {
    // Errors in the root layout, and in error.tsx itself, are catchable
    // nowhere else.
    const globalError = read('app/global-error.tsx');
    expect(globalError).toMatch(/captureException\(error\)/);
    // It replaces the document, so it must bring its own html/body.
    expect(globalError).toMatch(/<html/);
    expect(globalError).toMatch(/<body/);
  });

  it('error.tsx actually notifies, as it has always claimed', () => {
    const errorPage = read('app/error.tsx');
    expect(errorPage).toMatch(/captureException\(error\)/);
    // The claim that made this load-bearing.
    expect(errorPage).toMatch(/team has been\s+notified/);
  });
});

describe('privacy defaults', () => {
  it('drops request bodies and cookies on every runtime that sees them', () => {
    // The proxy reads auth cookies, so the edge runtime is the one where
    // leaving them attached would matter most.
    for (const source of [serverConfig, edgeConfig, clientConfig]) {
      expect(source).toMatch(/delete event\.request\.data/);
      expect(source).toMatch(/delete event\.request\.cookies/);
    }
  });

  it('scrubs breadcrumb URLs where breadcrumbs are collected', () => {
    // Every Supabase call becomes a breadcrumb, and a PostgREST query string
    // is a list of column filters (`?email=eq.…`).
    for (const source of [serverConfig, clientConfig]) {
      expect(source).toMatch(/beforeBreadcrumb/);
    }
  });

  it('ships no Session Replay', () => {
    // It records the DOM of a real owner's dashboard — coupon codes, customer
    // names, phone numbers. A product and legal decision (plan §5 Q4), not a
    // config default. Comments stripped so the file can explain its absence.
    expect(stripComments(clientConfig)).not.toMatch(/replayIntegration|Replay/);
  });
});

describe('the capture helper', () => {
  const capture = read('lib/utils/captureError.ts');

  it('imports the SDK lazily and only with a DSN configured', () => {
    // A static import would pull the SDK into every test that touches an
    // action or an API route. The suite must stay offline (SN20), and this is
    // what guarantees it by construction rather than by mocking.
    expect(capture).not.toMatch(/^import .*@sentry\/nextjs/m);
    expect(capture).toMatch(/if \(!process\.env\.SENTRY_DSN\) return;/);
    expect(capture).toMatch(/void import\('@sentry\/nextjs'\)/);
  });

  it('drops control-flow throws before reporting', () => {
    // Several actions catch broadly enough to swallow a `redirect()`.
    expect(capture).toMatch(/isExpectedError/);
  });
});

describe('in-app browser noise filters (ST10)', () => {
  // Meta's in-app browser injects a native bridge into every page it renders,
  // and that bridge throws on unload. Two of the first five production issues
  // were this, on /signup — and a large share of PH traffic arrives that way,
  // against a tunnel rate-limited at 60/60s where a spent quota drops REAL
  // errors too.
  // Sweep for the symbols the filters ACTUALLY match on. `postMessage` was in
  // this list originally, but no filter matches the bare word — the entry is
  // the full sentence `Error invoking postMessage: Java object is gone`. Left
  // in, a legitimate future `window.postMessage`/worker call would fail this
  // test for no over-filtering reason, and a guard that cries wolf gets deleted.
  const filtered = [
    'messageHandlers',
    'sendDataToNative',
    'navigation_performance_logger',
  ];

  it('filters both halves of the Meta bridge', () => {
    // Android reports from its own `app://` script, so denyUrls catches it.
    expect(clientConfig).toMatch(
      /denyUrls:\s*\[[^\]]*navigation_performance_logger_android/,
    );
    // iOS runs inline in the document and reports against OUR path, so it can
    // only be matched by message.
    expect(clientConfig).toMatch(/window\\\.webkit\\\.messageHandlers/);
    expect(clientConfig).toContain(
      'Error invoking postMessage: Java object is gone',
    );
  });

  it('never filters a symbol this codebase actually uses', () => {
    // THE load-bearing assertion. An over-broad ignore drops real events and
    // does it invisibly — there is no error anywhere, the events simply stop.
    // The filters above are only safe because none of these symbols appears in
    // first-party code. The day someone legitimately adds `postMessage`, this
    // fails and forces the filter to be re-narrowed rather than silently
    // eating that feature's errors.
    const hits = execSync(
      `grep -rln -e ${filtered.map((s) => `'${s}'`).join(' -e ')} ` +
        'app components lib config providers hooks || true',
      { encoding: 'utf8', cwd: ROOT },
    )
      .split('\n')
      .filter((f) => f && !f.includes('__tests__') && !f.includes('__test__'));

    expect(hits).toEqual([]);
  });
});

describe('both error funnels report (SN7, SN8)', () => {
  const response = read('app/api/helpers/response.ts');

  it('the API 500 funnel captures', () => {
    expect(response).toMatch(/captureServerError\(context, error/);
    expect(response).not.toMatch(/^import .*@sentry\/nextjs/m);
  });

  it('user attribution stays id-only (ST8 / SN15)', () => {
    // `sendDefaultPii` is false in all three runtimes; the ST8 userId parameter
    // must not become the way PII gets in anyway. The capture helper may set a
    // user, but only ever `{ id }`.
    const capture = stripComments(read('lib/utils/captureError.ts'));
    expect(capture).toMatch(/scope\.setUser\(\{ id: userId \}\)/);
    expect(capture).not.toMatch(
      /setUser\([^)]*\b(email|username|ip_address)\b/,
    );
    // `withScope`, never a bare `Sentry.setUser` — the latter writes to a scope
    // that outlives the call, so a later event from a DIFFERENT request can
    // inherit this user's id. That is the defect SN15 refused to ship.
    expect(capture).toMatch(/Sentry\.withScope\(/);
    expect(capture).not.toMatch(/Sentry\.setUser\(/);
  });

  /** Every `'use server'` file, minus types/validation/tests. */
  const actionFiles = () =>
    execSync('grep -rln "\'use server\'" app lib --include=*.ts', {
      encoding: 'utf8',
      cwd: ROOT,
    })
      .split('\n')
      .filter(
        (f) =>
          f &&
          !f.includes('__tests__') &&
          !f.startsWith('lib/types') &&
          !f.startsWith('lib/validation'),
      );

  /**
   * Yield each `catch` block's body, with its opening line kept so an opt-out
   * comment on the catch itself is visible. Brace-matched rather than
   * regex-sliced: a catch body contains braces, and the naive version stops at
   * the first `}` — which is usually the returned object literal.
   */
  function* catchBlocks(source: string) {
    // `\(\w+\)` matched only a bare identifier, so `catch (err: unknown)` and
    // `catch ({ message })` were skipped ENTIRELY and passed the guard silently
    // — the same false-green this test exists to kill. `lib/services/*` already
    // uses the annotated form, so the shape is in-repo.
    const re = /\}\s*catch\s*(?:\([^)]*\))?\s*\{/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(source))) {
      let depth = 0;
      for (let p = m.index + m[0].length - 1; p < source.length; p++) {
        if (source[p] === '{') depth++;
        else if (source[p] === '}' && --depth === 0) {
          yield { body: source.slice(m.index, p + 1), line: m.index };
          break;
        }
      }
    }
  }

  it('every Server Action catch reports, rethrows, or opts out explicitly', () => {
    // ST6. This assertion replaced one that hunted a known-bad LOG SHAPE
    // (`console.error('[name]', err)`). That version proved only that the
    // original codemod converted what it converted: it matched neither
    // `console.error('[loginAction] Error:', error)` (extra text inside the
    // string) nor a catch that logs nothing at all — and 36 unreported catch
    // blocks across six files passed it green.
    //
    // Coverage is the invariant, so coverage is what is asserted. A catch may
    // report, rethrow, or say in a `sentry-opt-out:` comment why it is neither.
    // The opt-out exists because some catches are genuinely control flow (a
    // `headers()` call outside a request scope), and a guard with no escape
    // hatch gets disabled rather than satisfied.
    const missed: string[] = [];

    for (const file of actionFiles()) {
      const raw = read(file);
      for (const block of catchBlocks(raw)) {
        if (/sentry-opt-out:/.test(block.body)) continue;

        const code = stripComments(block.body);
        if (/logActionError|captureServerError|loggedServerError/.test(code))
          continue;
        if (/\bthrow\b/.test(code)) continue;

        const lineNo = raw.slice(0, block.line).split('\n').length;
        missed.push(`${file}:${lineNo}`);
      }
    }

    expect(missed).toEqual([]);
  });

  it('the opt-out has to give a reason, not just the marker', () => {
    // Otherwise `sentry-opt-out:` becomes a silencer people paste in.
    for (const file of actionFiles()) {
      for (const block of catchBlocks(read(file))) {
        const optOut = block.body.match(/sentry-opt-out:(.*)/);
        if (optOut) expect(optOut[1].trim().length).toBeGreaterThan(15);
      }
    }
  });
});
