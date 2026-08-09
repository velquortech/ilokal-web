/**
 * Sentry — browser.
 *
 * Phase 3 of `.claude/SENTRY_MONITORING.md`. Phase 1 was server-only precisely
 * because this file is where the cost and the risk live: it ships bytes to
 * `/home`, `/explore` and `/for-business` — the pages a stranger loads first —
 * and it sends from the browser, which means the CSP in `next.config.ts` has to
 * allow it or every event is silently dropped in production while appearing to
 * work in dev (SN4).
 *
 * Requests go through the same-origin tunnel (`tunnelRoute` in
 * `next.config.ts`), NOT directly to the ingest host. See that file for why.
 *
 * ⚠️ Session Replay is deliberately absent. It records the DOM of a real
 * owner's dashboard — coupon codes, customer names, phone numbers — and that is
 * a product and legal decision (plan §5 Q4), not a config default.
 */

import * as Sentry from '@sentry/nextjs';
import { isExpectedError, scrubObject, scrubUrl } from '@/lib/utils/monitoring';

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;

Sentry.init({
  dsn,
  enabled: Boolean(dsn),

  // `release` is NOT passed. The SDK spreads caller options LAST, so setting it
  // here would overwrite the release the bundler injected — including with
  // `undefined` when the env var is unset, which is what would actually have
  // happened on Vercel. That injected value is the one the uploaded source maps
  // are keyed to. See `sentry.server.config.ts` for the full note.
  //
  // `environment` is applied only when explicitly configured, for the same
  // reason: unset, the SDK falls back to `NEXT_PUBLIC_VERCEL_ENV` and can tell
  // a preview deploy from production. An unconditional value cannot.
  ...(process.env.NEXT_PUBLIC_SENTRY_ENVIRONMENT
    ? { environment: process.env.NEXT_PUBLIC_SENTRY_ENVIRONMENT }
    : {}),

  // Same rule as the server: this app stores emails, phone numbers, addresses
  // and live cashier codes, and a browser event can carry any of them.
  sendDefaultPii: false,

  // Browser traffic is far higher volume than server errors, and the free tier
  // is 10k performance units a month (SN11/F16).
  tracesSampleRate: Number(
    process.env.NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE ?? 0.01,
  ),

  // Browser extensions and cross-origin script errors produce events that are
  // not this app's code and cannot be actioned.
  //
  // ⚠️ A filter that is too broad drops REAL events and does it invisibly —
  // the same failure shape the same-origin tunnel was chosen to avoid. Every
  // entry below therefore matches a symbol this codebase does not contain:
  // `messageHandlers`, `sendDataToNative`, `postMessage` and
  // `navigation_performance_logger` each appear 0 times across
  // app/components/lib/config/providers/hooks. Re-check that before widening
  // one, and never match on a bare word like `postMessage` that we might
  // legitimately start using.
  ignoreErrors: [
    'ResizeObserver loop limit exceeded',
    'ResizeObserver loop completed with undelivered notifications',
    'Non-Error promise rejection captured',

    // Meta's in-app browser (Facebook / Messenger) injects its own native
    // bridge into every page it renders, and that bridge throws on unload when
    // the native side has already gone away. Not our bundle: the Android half
    // lives in `app://navigation_performance_logger_android` (see denyUrls),
    // and the iOS half runs inline in the document, so it reports against our
    // own path and can only be caught by message.
    //
    // This matters more than the event count suggests — a large share of PH
    // traffic arrives through those in-app browsers, both fired on /signup,
    // and the tunnel is rate-limited at 60/60s: a spent quota drops real
    // errors too. (JAVASCRIPT-NEXTJS-2, JAVASCRIPT-NEXTJS-3)
    'Error invoking postMessage: Java object is gone',
    /window\.webkit\.messageHandlers/,
    /\bsendDataToNative\b/,
  ],

  // Frames whose URL is not this app. `denyUrls` matches the event's frame
  // URLs, so it catches the Android bridge (which loads as its own `app://`
  // script) but NOT the iOS one, which is evaluated in the document's own
  // context — hence the message matches above.
  denyUrls: [/^app:\/\/navigation_performance_logger_android/],

  beforeSend(event, hint) {
    if (isExpectedError(hint?.originalException)) return null;

    if (event.request?.url) event.request.url = scrubUrl(event.request.url);
    if (event.request) {
      delete event.request.data;
      delete event.request.cookies;
      delete event.request.query_string;
    }
    if (event.extra) event.extra = scrubObject(event.extra);
    if (event.contexts) event.contexts = scrubObject(event.contexts);

    return event;
  },

  beforeBreadcrumb(breadcrumb) {
    // `fetch`/`xhr` breadcrumbs record every Supabase call the browser makes,
    // and a PostgREST query string is a list of column filters (`?email=eq.…`).
    if (typeof breadcrumb.data?.url === 'string') {
      breadcrumb.data.url = scrubUrl(breadcrumb.data.url);
    }
    if (breadcrumb.data) breadcrumb.data = scrubObject(breadcrumb.data);
    return breadcrumb;
  },
});

/** Required by the Next SDK to tie navigations to transactions. */
export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
