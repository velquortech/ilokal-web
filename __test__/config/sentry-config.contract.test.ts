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

describe('both error funnels report (SN7, SN8)', () => {
  const response = read('app/api/helpers/response.ts');

  it('the API 500 funnel captures', () => {
    expect(response).toMatch(/captureServerError\(context, error\)/);
    expect(response).not.toMatch(/^import .*@sentry\/nextjs/m);
  });

  it('no Server Action still logs a failure without reporting it', () => {
    // The action layer's blind spot is structural: an action catches its own
    // error and RETURNS a code, so it never throws and `onRequestError` never
    // sees it. `logActionError` is the funnel; a bare
    // `console.error('[someAction]', err)` is one that got missed.
    const actionFiles = execSync(
      'grep -rln "\'use server\'" app lib --include=*.ts',
      { encoding: 'utf8', cwd: ROOT },
    )
      .split('\n')
      .filter(
        (f) =>
          f &&
          !f.includes('__tests__') &&
          !f.startsWith('lib/types') &&
          !f.startsWith('lib/validation'),
      );

    const missed: string[] = [];
    for (const file of actionFiles) {
      const source = stripComments(read(file));
      // The exact shape the codemod converted: a tagged log of a caught value.
      const bare = source.match(
        /console\.error\('\[[A-Za-z0-9_.:/[\]-]+\]',\s*[A-Za-z_$][A-Za-z0-9_$]*\);/g,
      );
      if (bare) missed.push(`${file}: ${bare.join(', ')}`);
    }

    expect(missed).toEqual([]);
  });
});
