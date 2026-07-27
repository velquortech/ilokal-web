/**
 * Booking reads. RLS scopes every row: a customer sees only their own, an
 * owner only their business's (policies in `20260727000005`), so these queries
 * carry no ownership filter of their own beyond what the caller asks for.
 *
 * Both lists are `.range()`d with a piggybacked exact count — never
 * fetch-all-then-slice, which silently truncates at the PostgREST 1000-row cap.
 */

import { createServerSupabaseClient } from '@/supabase/server';
import { resolveStorageUrl } from '@/app/api/helpers/storage';
import type {
  BookingFilters,
  BookingStatus,
  BookingWithContext,
  PaginatedBookingsResponse,
} from '@/lib/types/booking';

const SELECT = `
  *,
  product:product_id ( id, name, image_url ),
  branch:branch_id ( id, name ),
  customer:user_id ( id, full_name ),
  business:business_id ( id, shop_name, logo_url )
`;

type Row = Record<string, unknown>;

async function mapRows(rows: Row[]): Promise<BookingWithContext[]> {
  const supabase = await createServerSupabaseClient();
  return rows.map((row) => {
    const product = row.product as {
      id: string;
      name: string;
      image_url: string | null;
    } | null;
    const business = row.business as {
      id: string;
      shop_name: string;
      logo_url: string | null;
    } | null;

    return {
      ...(row as unknown as BookingWithContext),
      // Seeds store full URLs, real uploads store raw in-bucket paths — an
      // unresolved path is a broken <Image> (mobile-api storage convention).
      product: product
        ? {
            ...product,
            image_url: resolveStorageUrl(
              supabase,
              'product-images',
              product.image_url,
            ),
          }
        : null,
      business: business
        ? {
            ...business,
            logo_url: resolveStorageUrl(
              supabase,
              'shop-logos',
              business.logo_url,
            ),
          }
        : null,
    };
  });
}

function paginate(filters: BookingFilters) {
  const page = Math.max(1, filters.page ?? 1);
  const perPage = Math.min(50, Math.max(1, filters.per_page ?? 10));
  return { page, perPage, from: (page - 1) * perPage, to: page * perPage - 1 };
}

/** Owner inbox. Soonest-first for pending work, newest-first otherwise. */
export async function getBusinessBookings(
  businessId: string,
  filters: BookingFilters = {},
): Promise<PaginatedBookingsResponse | { error: string }> {
  try {
    const supabase = await createServerSupabaseClient();
    const { page, perPage, from, to } = paginate(filters);

    let query = supabase
      .from('booking_requests')
      .select(SELECT, { count: 'exact' })
      .eq('business_id', businessId);

    if (filters.status) {
      query = query.eq('status', filters.status as BookingStatus);
    }

    const { data, error, count } = await query
      .order('starts_at', { ascending: true })
      .range(from, to);

    if (error) {
      console.error('[getBusinessBookings]', error);
      return { error: 'Failed to load bookings' };
    }

    const total = count ?? 0;
    return {
      bookings: await mapRows((data ?? []) as Row[]),
      total,
      page,
      per_page: perPage,
      total_pages: Math.max(1, Math.ceil(total / perPage)),
    };
  } catch (err) {
    console.error('[getBusinessBookings]', err);
    return { error: 'Failed to load bookings' };
  }
}

/** The customer's own bookings. */
export async function getUserBookings(
  userId: string,
  filters: BookingFilters = {},
): Promise<PaginatedBookingsResponse | { error: string }> {
  try {
    const supabase = await createServerSupabaseClient();
    const { page, perPage, from, to } = paginate(filters);

    let query = supabase
      .from('booking_requests')
      .select(SELECT, { count: 'exact' })
      .eq('user_id', userId);

    if (filters.status) {
      query = query.eq('status', filters.status as BookingStatus);
    }

    const { data, error, count } = await query
      .order('starts_at', { ascending: false })
      .range(from, to);

    if (error) {
      console.error('[getUserBookings]', error);
      return { error: 'Failed to load bookings' };
    }

    const total = count ?? 0;
    return {
      bookings: await mapRows((data ?? []) as Row[]),
      total,
      page,
      per_page: perPage,
      total_pages: Math.max(1, Math.ceil(total / perPage)),
    };
  } catch (err) {
    console.error('[getUserBookings]', err);
    return { error: 'Failed to load bookings' };
  }
}

/**
 * Counts for the mode-aware owner dashboard (OF9) — the panel that gives a
 * coupon-less services business something other than zeros.
 *
 * Aggregated in SQL via head-only counts, never by fetching rows and reducing
 * in Node (PostgREST caps at 1000 and would return WRONG numbers past that).
 */
export async function getBookingStats(businessId: string): Promise<{
  pending: number;
  confirmed: number;
  upcoming: number;
  total: number;
}> {
  const zero = { pending: 0, confirmed: 0, upcoming: 0, total: 0 };
  try {
    const supabase = await createServerSupabaseClient();
    const base = () =>
      supabase
        .from('booking_requests')
        .select('id', { count: 'exact', head: true })
        .eq('business_id', businessId);

    const [pending, confirmed, upcoming, total] = await Promise.all([
      base().eq('status', 'pending'),
      base().eq('status', 'confirmed'),
      base()
        .eq('status', 'confirmed')
        .gte('starts_at', new Date().toISOString()),
      base(),
    ]);

    return {
      pending: pending.count ?? 0,
      confirmed: confirmed.count ?? 0,
      upcoming: upcoming.count ?? 0,
      total: total.count ?? 0,
    };
  } catch (err) {
    console.error('[getBookingStats]', err);
    return zero;
  }
}
