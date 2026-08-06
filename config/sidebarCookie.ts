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
