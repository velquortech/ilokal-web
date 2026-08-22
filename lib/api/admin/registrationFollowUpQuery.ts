/**
 * Admin read: owner accounts that never finished registering a shop.
 *
 * The cohort the product previously could not reach at all. Measured
 * 2026-08-22: 41 live `business_owner` accounts, 21 businesses — 49% of owners
 * sign up and produce no shop, and because the wizard holds everything in
 * `localStorage` until the final submit, they leave no server-side trace to
 * follow up on. This is the read side of that follow-up. See
 * `.claude/REGISTRATION_FUNNEL.md` (P7).
 *
 * A deliberate twin of `menuFollowUpQuery.ts` — same guards, same failure
 * contract, same pagination reasoning:
 *
 *   1. Admin is verified BEFORE the RLS-bypassing service-role client is used
 *      (the standing rule — the caller proves authority first).
 *   2. The service-role client is the only thing that may call the RPCs; their
 *      EXECUTE is granted to `service_role` alone.
 *   3. The list RPC returns ONE PAGE. Totals come from a separate uncapped
 *      COUNT RPC and "send to all" from an id RPC — never from the page, which
 *      PostgREST would cap at `max_rows` (1000).
 *
 * Never throws. A failed read reports `failed: true` so the UI can tell an
 * outage from "nobody needs a nudge" — the two look identical otherwise, and
 * conflating them is how an outage reads as good news.
 */

import { createAnalyticsSupabaseClient } from '@/supabase/server';
import { getCurrentUser } from '@/lib/api/getCurrentUser';
import type { Database } from '@/lib/types/database';
import { formatErrorForLog } from '@/lib/utils/describeDbError';

type MissingBusinessRpcRow =
  Database['public']['Functions']['admin_owners_missing_business']['Returns'][number];

export interface OwnerMissingBusiness {
  /** The PROFILE id — this cohort has no business row to key on. */
  id: string;
  owner_email: string;
  owner_name: string | null;
  signed_up_at: string | null;
  /**
   * Furthest wizard step reached, from `owner_events`.
   *
   * NULL for most of the existing backlog: the funnel table only began
   * recording on 2026-08-15. That is honest rather than broken — it means
   * "we never saw them", not "they never started".
   */
  furthest_step: number | null;
  last_activity_at: string | null;
  /** They had a business row once and it was archived — a different story. */
  had_business: boolean;
  registration_reminder_sent_at: string | null;
}

export interface OwnersMissingBusinessPage {
  rows: OwnerMissingBusiness[];
  total: number;
  /** How many got far enough into the wizard to emit an event. */
  started: number;
  reminded: number;
  /** The read failed — distinct from an empty list. */
  failed: boolean;
}

/** Verify admin, then hand back a service-role client. Null = not admin. */
async function adminClient() {
  const user = await getCurrentUser();
  if (!user || user.role !== 'admin') return null;
  return createAnalyticsSupabaseClient();
}

export async function getOwnersMissingBusiness(opts: {
  search?: string;
  onlyStarted?: boolean;
  page?: number;
  pageSize?: number;
}): Promise<OwnersMissingBusinessPage> {
  const empty: OwnersMissingBusinessPage = {
    rows: [],
    total: 0,
    started: 0,
    reminded: 0,
    failed: false,
  };
  try {
    const supabase = await adminClient();
    if (!supabase) return empty;

    const pageSize = opts.pageSize ?? 10;
    const page = Math.max(1, opts.page ?? 1);
    const search = opts.search?.trim() || undefined;
    const onlyStarted = opts.onlyStarted ?? false;

    const [list, stats] = await Promise.all([
      supabase.rpc('admin_owners_missing_business', {
        p_search: search,
        p_only_started: onlyStarted,
        p_limit: pageSize,
        p_offset: (page - 1) * pageSize,
      }),
      supabase.rpc('admin_owners_missing_business_stats', {
        p_search: search,
        p_only_started: onlyStarted,
      }),
    ]);

    if (list.error || stats.error) {
      console.error(
        '[getOwnersMissingBusiness]',
        formatErrorForLog(list.error ?? stats.error),
      );
      return { ...empty, failed: true };
    }

    const rows: OwnerMissingBusiness[] = (
      (list.data ?? []) as MissingBusinessRpcRow[]
    ).map((row) => ({
      id: row.id,
      owner_email: row.owner_email,
      owner_name: row.owner_name ?? null,
      signed_up_at: row.signed_up_at ?? null,
      // The RPC casts a JSONB text to int; a null comes back as null, and
      // `Number(null)` would silently become 0 — i.e. "step 0", a step that
      // does not exist.
      furthest_step:
        row.furthest_step == null ? null : Number(row.furthest_step),
      last_activity_at: row.last_activity_at ?? null,
      had_business: row.had_business,
      registration_reminder_sent_at: row.registration_reminder_sent_at ?? null,
    }));

    const stat = Array.isArray(stats.data) ? stats.data[0] : undefined;
    return {
      rows,
      total: Number(stat?.total ?? 0),
      started: Number(stat?.started ?? 0),
      reminded: Number(stat?.reminded ?? 0),
      failed: false,
    };
  } catch (err) {
    console.error('[getOwnersMissingBusiness]', formatErrorForLog(err));
    return { ...empty, failed: true };
  }
}

/**
 * Every matching owner id, for "send to all" — derived server-side so the
 * button never acts on a page-capped client list. Admin-checked; `[]` when not
 * admin or on failure (the batch action then simply sends nothing).
 */
export async function getOwnersMissingBusinessIds(opts: {
  search?: string;
  onlyStarted?: boolean;
}): Promise<string[]> {
  try {
    const supabase = await adminClient();
    if (!supabase) return [];

    const { data, error } = await supabase.rpc(
      'admin_owners_missing_business_ids',
      {
        p_search: opts.search?.trim() || undefined,
        p_only_started: opts.onlyStarted ?? false,
      },
    );
    if (error) {
      console.error('[getOwnersMissingBusinessIds]', formatErrorForLog(error));
      return [];
    }
    return (data as string[] | null) ?? [];
  } catch (err) {
    console.error('[getOwnersMissingBusinessIds]', formatErrorForLog(err));
    return [];
  }
}
