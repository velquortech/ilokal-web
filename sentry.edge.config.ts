/**
 * Sentry — edge runtime.
 *
 * This is the runtime `proxy.ts` runs in, so it covers the session refresh, the
 * role gate and the MFA gate (SN18).
 *
 * Most of what fails there is not a fault: an unauthenticated visitor being
 * redirected to `/sign-in` is the proxy working. `beforeSend` drops those the
 * same way the server config does, or the proxy would generate more events than
 * the rest of the app combined.
 */

import * as Sentry from '@sentry/nextjs';
import {
  isExpectedError,
  scrubHeaders,
  scrubUrl,
} from '@/lib/utils/monitoring';

const dsn = process.env.SENTRY_DSN;

Sentry.init({
  dsn,
  enabled: Boolean(dsn),

  // Not passed, for the reason spelled out in `sentry.server.config.ts`: the
  // SDK spreads caller options LAST, so setting these here overrides the
  // bundler-injected release (the one matching the uploaded source maps) and
  // Vercel's own environment detection. The edge SDK resolves `environment`
  // from `SENTRY_ENVIRONMENT` by itself.

  sendDefaultPii: false,

  // The proxy runs on EVERY matched navigation, so a sample rate that is fine
  // for route handlers is not fine here.
  tracesSampleRate: Number(process.env.SENTRY_EDGE_TRACES_SAMPLE_RATE ?? 0.01),

  beforeSend(event, hint) {
    if (isExpectedError(hint?.originalException)) return null;

    if (event.request) {
      if (event.request.url) event.request.url = scrubUrl(event.request.url);
      if (event.request.headers) {
        event.request.headers = scrubHeaders(event.request.headers) as Record<
          string,
          string
        >;
      }
      // The proxy reads auth cookies; they must never leave with the event.
      delete event.request.cookies;
      delete event.request.data;
      delete event.request.query_string;
    }

    return event;
  },
});
