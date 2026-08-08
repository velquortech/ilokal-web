/**
 * Sentry — Node server runtime.
 *
 * Loaded by `instrumentation.ts`'s `register()` at server boot, and by nothing
 * else. Vitest never loads this file, which is why the rules it applies live in
 * `lib/utils/monitoring.ts` as pure, tested functions.
 *
 * ⚠️ SERVER ONLY, deliberately. There is no `instrumentation-client.ts` and no
 * `sentry.edge.config.ts` on this branch. Phase 1 of
 * `.claude/SENTRY_MONITORING.md` ships the half that costs the public pages
 * (`/home`, `/explore`, `/for-business`) zero client bytes and needs no CSP
 * change, because a server→Sentry request is not subject to browser CSP.
 * Client and edge are phases 3 and 5 and need their own approval.
 *
 * ⚠️ The DSN is read from `SENTRY_DSN`, NOT `NEXT_PUBLIC_SENTRY_DSN`. Nothing
 * in the browser needs it while this is server-only, and a `NEXT_PUBLIC_`
 * prefix would inline it into the client bundle — the same rule that governs
 * the Supabase service-role key.
 */

import * as Sentry from '@sentry/nextjs';
import {
  isExpectedError,
  scrubHeaders,
  scrubObject,
  scrubUrl,
} from '@/lib/utils/monitoring';

const dsn = process.env.SENTRY_DSN;

Sentry.init({
  dsn,

  // No DSN means no reporting, rather than a half-configured SDK that queues
  // events nobody receives. This is also what keeps local dev and CI silent.
  enabled: Boolean(dsn),

  // ⚠️ `environment` and `release` are deliberately NOT passed.
  //
  // The SDK builds its options as
  // `{ environment: …, release: process.env._sentryRelease || <injected>, ...options }`
  // — with `...options` spread LAST. So any key set here WINS, **including when
  // its value is `undefined`**. Passing `release` therefore overwrites the
  // release the bundler injected at build time, which is the one tied to the
  // uploaded source maps; a mismatch there means frames never symbolicate.
  // Passing `environment` overrides Vercel detection, collapsing preview and
  // production deploys into one environment.
  //
  // Left off, the SDK resolves both itself: `SENTRY_ENVIRONMENT`, then
  // `VERCEL_ENV`, then `NODE_ENV`; and the injected release. Set
  // `SENTRY_ENVIRONMENT` to override — the SDK reads it directly.

  // ⚠️ Must stay false. This app stores emails, phone numbers, addresses,
  // uploaded licence and tax documents, and live cashier redemption codes
  // (SN6). `true` would attach request bodies, headers and user identity
  // automatically.
  sendDefaultPii: false,

  // Free tier is 5k errors + 10k performance units a month, and this app has
  // 126 error sites in `app/api` alone (SN11/F16). Start low; raise only with
  // a quota alert already wired.
  tracesSampleRate: Number(process.env.SENTRY_TRACES_SAMPLE_RATE ?? 0.05),

  beforeSend(event, hint) {
    // Drop control-flow throws. Every `redirect()` in the app throws one, and
    // the proxy redirects on each unauthenticated navigation — unfiltered,
    // these are the majority of events and they would exhaust the quota that
    // real errors need (SN14).
    if (isExpectedError(hint?.originalException)) return null;

    if (event.request) {
      if (event.request.url) event.request.url = scrubUrl(event.request.url);
      if (event.request.headers) {
        event.request.headers = scrubHeaders(event.request.headers) as Record<
          string,
          string
        >;
      }
      // Bodies and query strings are never worth the risk here: every write
      // path in this app carries owner-supplied personal data.
      delete event.request.data;
      delete event.request.cookies;
      if (event.request.query_string) {
        delete event.request.query_string;
      }
    }

    if (event.extra) event.extra = scrubObject(event.extra);
    if (event.contexts) event.contexts = scrubObject(event.contexts);

    return event;
  },

  beforeBreadcrumb(breadcrumb) {
    // Breadcrumbs record outgoing HTTP calls, and every Supabase call carries
    // an Authorization header and a PostgREST query string full of column
    // filters (`?email=eq.…`).
    if (breadcrumb.data?.url && typeof breadcrumb.data.url === 'string') {
      breadcrumb.data.url = scrubUrl(breadcrumb.data.url);
    }
    if (breadcrumb.data) breadcrumb.data = scrubObject(breadcrumb.data);
    return breadcrumb;
  },
});
