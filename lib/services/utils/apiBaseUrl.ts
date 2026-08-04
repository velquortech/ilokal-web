/**
 * The base every HTTP client in `lib/services/` resolves its paths against.
 *
 * **In the browser this MUST be empty.** An absolute base makes the request
 * cross-origin the moment the page is not served from exactly that host — and
 * the base used to be a hardcoded `http://localhost:3000`, with
 * `NEXT_PUBLIC_API_URL` set nowhere in this repo. So in production the page
 * loaded from the real domain and then POSTed to the *visitor's own machine*,
 * where nothing is listening: axios reported `Network Error` with no response
 * and no status, which is what "Submit for Approval does nothing" was. Locally
 * it only worked while you browsed `localhost:3000` exactly — `127.0.0.1`, a
 * LAN address or a fallback port made it cross-origin, and `withCredentials`
 * without CORS headers turns that into the same opaque failure.
 *
 * An empty base means axios resolves `/api/...` against the current origin, so
 * it is correct on every host, port and preview deployment with no
 * configuration at all.
 *
 * On the server there is no origin to resolve against, so an absolute URL is
 * required. `NEXT_PUBLIC_APP_URL` is the value this app already uses for share
 * links and OG tags — reused rather than duplicated under a second name, and
 * it must be set at BUILD time (`NEXT_PUBLIC_*` is inlined).
 */
export function apiBaseUrl(): string {
  if (typeof window !== 'undefined') return '';

  return (
    process.env.NEXT_PUBLIC_API_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    'http://localhost:3000'
  );
}
