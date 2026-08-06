/**
 * Admin read: verified shops with no live menu (candidates for a follow-up
 * email).
 *
 * Backed by SECURITY DEFINER RPCs that aggregate across EVERY shop and read
 * owner emails, which no RLS-scoped client could do. Two guards therefore
 * matter and both live here:
 *
 *   1. Admin is verified BEFORE the RLS-bypassing service-role client is used
 *      (the standing analytics rule — the caller proves authority first).
 *   2. The service-role client is the only thing that may call the RPCs; their
 *      EXECUTE is granted to `service_role` alone.
 *
 * Paginated on purpose: the list RPC returns ONE PAGE. Fetching the whole set
 * and counting in Node would hit PostgREST's `max_rows` cap (1000) and silently
 * under-read on a platform whose whole job here is accumulating empty shops —
 * so the stat totals come from a separate uncapped COUNT RPC and "send to all"
 * from an id RPC, never from the page.
 *
 * Never throws. A failed read reports `failed: true` so the UI can tell an
 * outage from "no shops need a nudge".
 */

import { createAnalyticsSupabaseClient } from '@/supabase/server';
import { getCurrentUser } from '@/lib/api/getCurrentUser';
import type { Database } from '@/lib/types/database';

type MissingMenuRpcRow =
  Database['public']['Functions']['admin_businesses_missing_menu']['Returns'][number];

export interface MissingMenuBusiness {
  id: string;
  shop_name: string;
  owner_email: string;
  owner_name: string | null;
  offering_noun: string;
  offering_plural: string;
  has_live_menu: boolean;
  has_live_promo: boolean;
  menu_reminder_sent_at: string | null;
  created_at: string | null;
}

export interface MissingMenuPage {
  rows: MissingMenuBusiness[];
  total: number;
  noPromo: number;
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

export async function getBusinessesMissingMenu(opts: {
  search?: string;
  onlyNoPromo?: boolean;
  page?: number;
  pageSize?: number;
}): Promise<MissingMenuPage> {
  const empty: MissingMenuPage = {
    rows: [],
    total: 0,
    noPromo: 0,
    reminded: 0,
    failed: false,
  };
  try {
    const supabase = await adminClient();
    if (!supabase) return empty;

    const pageSize = opts.pageSize ?? 10;
    const page = Math.max(1, opts.page ?? 1);
    const search = opts.search?.trim() || undefined;
    const onlyNoPromo = opts.onlyNoPromo ?? false;

    const [list, stats] = await Promise.all([
      supabase.rpc('admin_businesses_missing_menu', {
        p_search: search,
        p_only_no_promo: onlyNoPromo,
        p_limit: pageSize,
        p_offset: (page - 1) * pageSize,
      }),
      supabase.rpc('admin_businesses_missing_menu_stats', {
        p_search: search,
        p_only_no_promo: onlyNoPromo,
      }),
    ]);

    if (list.error || stats.error) {
      console.error('[getBusinessesMissingMenu]', list.error ?? stats.error);
      return { ...empty, failed: true };
    }

    const rows: MissingMenuBusiness[] = (
      (list.data ?? []) as MissingMenuRpcRow[]
    ).map((row) => ({
      id: row.id,
      shop_name: row.shop_name,
      owner_email: row.owner_email,
      owner_name: row.owner_name ?? null,
      offering_noun: row.offering_noun,
      offering_plural: row.offering_plural,
      has_live_menu: row.has_live_menu,
      has_live_promo: row.has_live_promo,
      menu_reminder_sent_at: row.menu_reminder_sent_at ?? null,
      created_at: row.created_at ?? null,
    }));

    const stat = Array.isArray(stats.data) ? stats.data[0] : undefined;
    return {
      rows,
      total: Number(stat?.total ?? 0),
      noPromo: Number(stat?.no_promo ?? 0),
      reminded: Number(stat?.reminded ?? 0),
      failed: false,
    };
  } catch (err) {
    console.error('[getBusinessesMissingMenu]', err);
    return { ...empty, failed: true };
  }
}

/**
 * Every matching shop id, for "send to all" — derived server-side so the button
 * never acts on a page-capped client list. Admin-checked; `[]` when not admin
 * or on failure (the batch action then simply sends nothing).
 */
export async function getMissingMenuIds(opts: {
  search?: string;
  onlyNoPromo?: boolean;
}): Promise<string[]> {
  try {
    const supabase = await adminClient();
    if (!supabase) return [];

    const { data, error } = await supabase.rpc(
      'admin_businesses_missing_menu_ids',
      {
        p_search: opts.search?.trim() || undefined,
        p_only_no_promo: opts.onlyNoPromo ?? false,
      },
    );
    if (error) {
      console.error('[getMissingMenuIds]', error);
      return [];
    }
    return (data as string[] | null) ?? [];
  } catch (err) {
    console.error('[getMissingMenuIds]', err);
    return [];
  }
}
