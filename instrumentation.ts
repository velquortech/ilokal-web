/**
 * Next.js instrumentation hook (root-level file convention, stable since 15;
 * this repo runs 16.2.6). Verified against
 * https://nextjs.org/docs/app/api-reference/file-conventions/instrumentation
 * before it was written, per `permanent-rules.md` — Next 16 already renamed
 * `middleware` → `proxy`, so this shape is not assumable.
 *
 * `register()` runs once per server instance, before the first request.
 *
 * Both server runtimes are initialised: `nodejs` for route handlers, Server
 * Actions and RSC rendering, `edge` for `proxy.ts`. The browser is initialised
 * separately by `instrumentation-client.ts`, which Next loads itself — it is
 * NOT imported from here.
 */

import * as Sentry from '@sentry/nextjs';

export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    await import('./sentry.server.config');
  }
  if (process.env.NEXT_RUNTIME === 'edge') {
    await import('./sentry.edge.config');
  }
}

/**
 * Catches errors Next surfaces from Server Components, Route Handlers, Server
 * Actions and the proxy. Filtering happens centrally in `beforeSend` so there
 * is one drop-list rather than two that drift.
 */
export const onRequestError = Sentry.captureRequestError;
