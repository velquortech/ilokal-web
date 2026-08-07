/**
 * Welcome-post types.
 *
 * These live here rather than beside the query that produces them because the
 * composer is a CLIENT component: importing the type from
 * `lib/api/admin/analyticsQuery` means importing from a module that pulls in
 * `@/supabase/server` and therefore `next/headers`, and only the `import type`
 * keyword keeps that out of the client graph. One dropped keyword during a
 * refactor and the build breaks — or worse, does not.
 */

export interface WelcomePostCandidate {
  id: string;
  shop_name: string;
  logo_url: string | null;
  /**
   * Nullable in the schema, so it is nullable here.
   *
   * Asserting `string` was how a row with no timestamp sorted to the top of a
   * `desc` order (Postgres defaults to NULLS FIRST on DESC) and was then read
   * as the newest registration.
   */
  created_at: string | null;
}

/** How recent a registration has to be to count as "new" for the prompt. */
export const WELCOME_POST_NEW_DAYS = 14;

export interface WelcomePostCandidates {
  rows: WelcomePostCandidate[];
  /**
   * Ids inside the window, newest first — what the dashboard prompt links to.
   *
   * Derived from the cutoff rather than sliced off `rows` by a count: that only
   * worked because the query happened to order `created_at desc`, and it took
   * whatever sat at the top even when the timestamp was null.
   */
  newIds: string[];
  /**
   * How many registered inside the window.
   *
   * Counted in SQL, not by filtering the fetched page — the page is capped, so
   * a JS count silently stops rising once registrations pass the limit.
   */
  newCount: number;
  failed: boolean;
}
