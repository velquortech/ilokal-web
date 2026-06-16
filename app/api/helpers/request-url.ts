import { NextRequest } from 'next/server';

/**
 * Resolve the public base URL for building share/landing links.
 *
 * Prefers the host the request actually arrived on. That host is guaranteed
 * reachable (the client just hit it), and the mobile API + the public
 * `/s/[id]` landing page are served by the same Next app on the same origin —
 * so the request host is always the right base for a share link. This keeps
 * share links tracking the live deployment automatically, even when
 * `NEXT_PUBLIC_APP_URL` is unset, points at `localhost`, or is pinned to a dead
 * alias (the bug that produced 404 share links: env pointed at an old
 * `*.vercel.app` deployment that no longer exists).
 *
 * Falls back to `NEXT_PUBLIC_APP_URL` only when there is no request context
 * (e.g. a server-side call with no request).
 *
 * NOTE: this assumes the API and the web app share one origin. If they are ever
 * split onto separate domains, or a canonical custom domain must win over the
 * raw deployment URL, reintroduce an env-first override here. See tech-debt.
 */
export function resolveAppBaseUrl(req?: NextRequest): string {
  if (req) {
    const proto =
      req.headers.get('x-forwarded-proto') ??
      req.nextUrl.protocol.replace(/:$/, '');
    const host =
      req.headers.get('x-forwarded-host') ??
      req.headers.get('host') ??
      req.nextUrl.host;
    if (host) return `${proto}://${host}`.replace(/\/+$/, '');
  }

  return (process.env.NEXT_PUBLIC_APP_URL?.trim() ?? '').replace(/\/+$/, '');
}
