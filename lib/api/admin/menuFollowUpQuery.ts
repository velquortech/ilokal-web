/**
 * Admin read: verified shops with no live menu (candidates for a follow-up
 * email).
 *
 * Backed by the `admin_businesses_missing_menu` RPC — a SECURITY DEFINER
 * function that aggregates offering counts across EVERY shop and reads owner
 * emails, which no RLS-scoped client could do. Two guards therefore matter and
 * both live here:
 *
 *   1. Admin is verified BEFORE the RLS-bypassing service-role client is used
 *      (the standing analytics rule — the caller proves authority first).
 *   2. The service-role client is the only thing that may call the RPC; its
 *      EXECUTE is granted to `service_role` alone.
 *
 * Never throws. A failed read is reported as `failed: true` so the UI can tell
 * an outage from "no shops need a nudge" — the distinction this repo has had to
 * restore on several surfaces.
 */

import { createAnalyticsSupabaseClient } from '@/supabase/server';
import { getCurrentUser } from '@/lib/api/getCurrentUser';
import type { Database } from '@/lib/types/database';

/** One row of the RPC's result, straight from the generated types. */
type MissingMenuRpcRow =
  Database['public']['Functions']['admin_businesses_missing_menu']['Returns'][number];

export interface MissingMenuBusiness {
  id: string;
  shop_name: string;
  owner_email: string;
  owner_name: string | null;
  /** The shop's own word for its catalogue, e.g. "Menu", "Service Menu". */
  offering_noun: string;
  offering_plural: string;
  /** Always false in this list (the filter), carried for the row's own logic. */
  has_live_menu: boolean;
  /** A published, in-window coupon/deal exists. */
  has_live_promo: boolean;
  /** When the last reminder was sent; null = never. */
  menu_reminder_sent_at: string | null;
  created_at: string | null;
}

export interface MissingMenuResult {
  rows: MissingMenuBusiness[];
  /** The read failed — distinct from an empty list. */
  failed: boolean;
}

export async function getBusinessesMissingMenu(opts?: {
  search?: string;
  onlyNoPromo?: boolean;
}): Promise<MissingMenuResult> {
  try {
    // Verify admin BEFORE touching the service-role client. An unguarded
    // service-role read of every owner's email is exactly what this ordering
    // prevents. `getCurrentUser` is cookie-scoped and `React.cache`d.
    const user = await getCurrentUser();
    if (!user || user.role !== 'admin') {
      return { rows: [], failed: false };
    }

    const supabase = await createAnalyticsSupabaseClient();
    const { data, error } = await supabase.rpc(
      'admin_businesses_missing_menu',
      {
        p_search: opts?.search?.trim() || undefined,
        p_only_no_promo: opts?.onlyNoPromo ?? false,
      },
    );

    if (error) {
      console.error('[getBusinessesMissingMenu]', error);
      return { rows: [], failed: true };
    }

    const rows: MissingMenuBusiness[] = (
      (data ?? []) as MissingMenuRpcRow[]
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

    return { rows, failed: false };
  } catch (err) {
    console.error('[getBusinessesMissingMenu]', err);
    return { rows: [], failed: true };
  }
}
