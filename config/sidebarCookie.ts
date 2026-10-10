/**
 * Sidebar persistence cookie.
 *
 * Lives outside `components/ui/sidebar.tsx` for the same reason
 * `supabase/cookies.ts` was split out of `supabase/server.ts`: that file is
 * `'use client'`, and the **server** layout has to read this cookie to seed
 * `defaultOpen`. Two copies of the name is how a rename turns the read into a
 * silent no-op — the provider would keep writing, the layout would keep
 * reading nothing, and the sidebar would quietly stop remembering.
 */
export const SIDEBAR_COOKIE_NAME = 'sidebar_state';

export const SIDEBAR_COOKIE_MAX_AGE = 60 * 60 * 24 * 7;

/**
 * The sidebar is OPEN unless the owner has said otherwise. `cookies()` returns
 * undefined on a first visit, which must not read as "collapsed".
 */
export function sidebarDefaultOpen(cookieValue: string | undefined): boolean {
  return cookieValue !== 'false';
}

/**
 * The admin variant: CLOSED unless the admin has explicitly opened it.
 *
 * The two shells disagree on the default and that is deliberate, not an
 * oversight. The business sidebar is the owner's primary navigation and
 * defaults open (nav they can read beats nav they must decode); the admin
 * shell fronts wide data tables that want the horizontal room, and has shipped
 * collapsed since it was written. Encoding the difference here — rather than
 * passing a `fallback` argument each caller could get backwards — means the
 * default lives beside the cookie it reads, and neither shell can silently
 * inherit the other's.
 *
 * Absent cookie ⇒ today's behaviour, so this cannot change what an admin who
 * has never touched the rail sees.
 */
export function sidebarDefaultOpenClosedFirst(
  cookieValue: string | undefined,
): boolean {
  return cookieValue === 'true';
}
