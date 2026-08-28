import type { SupabaseClient } from '@supabase/supabase-js';

type StopRow = {
  id: string;
  business_id: string;
  stop_time: string | null; // PostgREST renders a `time` as "HH:mm:ss"
  position: number;
  businesses: {
    id: string;
    shop_name: string;
    logo_url: string | null;
  } | null;
};

type PublicInfoRow = { operating_hours: unknown } | null;

/**
 * Load a full plan in the shape the mobile schema expects, or null if the plan
 * is not the current user's (the caller maps null → 404). One round trip for
 * the plan + its stops joined to each business, then parallel
 * `get_business_public_info` calls for the stops' `operating_hours`.
 *
 * operating_hours is NOT read from business_settings directly: that table's
 * single RLS policy is owner-only ("Owner manages own business settings"), so
 * a run-of-the-mill user's token cannot select it. The established public path
 * is the SECURITY DEFINER RPC `get_business_public_info`, whose return column
 * list IS its contract — the mobile planner only ever sees operating_hours,
 * never the owner's internal config.
 *
 * A stop whose business is no longer publicly readable (unverified or
 * archived — `businesses` RLS gates on `status = 'verified' AND archived_at IS
 * NULL`) comes back with `business: null`, NOT dropped. Dropping it was silent
 * data loss: the stop vanished from the response, the client re-sent the
 * shortened list on the next reorder, and the row was deleted for good. A null
 * business lets the client render the stop as unavailable and, crucially, send
 * it back untouched.
 */
export async function loadPlanDetail(
  supabase: SupabaseClient,
  planId: string,
  userId: string,
) {
  const { data: plan, error } = await supabase
    .from('plans')
    .select(
      `
      id, title, target_date,
      plan_stops(
        id, business_id, stop_time, position,
        businesses(id, shop_name, logo_url)
      )
    `,
    )
    .eq('id', planId)
    .eq('user_id', userId)
    .order('position', { foreignTable: 'plan_stops', ascending: true })
    .maybeSingle();

  if (error) throw error;
  if (!plan) return null;

  // PostgREST models a to-one embed as an ARRAY in the generated types, while
  // the runtime payload carries a row object (or null) — cast through `unknown`
  // so the structural mismatch is explicit rather than a silent misread.
  const plan_stops = (plan.plan_stops ?? []) as unknown as StopRow[];

  // Hours are only fetchable for a business we can actually see; an invisible
  // one contributes no RPC call and carries null hours, which the client reads
  // as "unknown" (never "closed").
  const infoResults = await Promise.all(
    plan_stops.map((s) =>
      s.businesses
        ? supabase
            .rpc('get_business_public_info', { p_business_id: s.businesses.id })
            .maybeSingle()
        : Promise.resolve(null),
    ),
  );

  const stops = plan_stops.map((s, i) => {
    // rpc().maybeSingle() resolves to { data, error } — the RPC's return column
    // list is its contract, and plans only ever read operating_hours.
    const info = infoResults[i] as { data: PublicInfoRow } | null;
    return {
      id: s.id,
      // Carried on the stop itself, not only inside the joined business: an
      // unreadable business embeds as null, and without this the client could
      // not send the stop back and would erase it on the next save.
      business_id: s.business_id,
      // Normalize the Postgres "HH:mm:ss" back to the client's "HH:mm".
      stop_time: s.stop_time ? s.stop_time.slice(0, 5) : null,
      position: s.position,
      business: s.businesses
        ? {
            ...s.businesses,
            operating_hours: info?.data?.operating_hours ?? null,
          }
        : null,
    };
  });

  return {
    id: plan.id,
    title: plan.title,
    target_date: plan.target_date,
    stops,
  };
}
