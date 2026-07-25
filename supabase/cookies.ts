/**
 * Supabase auth-cookie constants.
 *
 * Lives apart from `supabase/server.ts` because that module imports
 * `next/headers` at module scope — the proxy (which also has to expire these
 * cookies) can't pull that in. `supabase/server.ts` re-exports both names, so
 * existing `@/supabase/server` import sites keep working.
 */

/**
 * Name prefix of every Supabase auth cookie (`sb-<project-ref>-auth-token`,
 * its `.0`/`.1` chunks, and `-code-verifier`). supabase-js derives this itself
 * and nothing here overrides `storageKey`/`cookieOptions.name`.
 */
export const SUPABASE_COOKIE_PREFIX = 'sb-';

/**
 * The attributes every Supabase auth cookie is written with. Deletion matches
 * on name + domain + path, so an expiry write MUST reuse these or the original
 * cookie survives — keep this the single source for both the write and the
 * clear (`clearSupabaseAuthCookies` in the auth actions, and the proxy's
 * MFA-elevation gate).
 */
export const SUPABASE_COOKIE_OPTIONS = Object.freeze({
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  path: '/',
});
