import { getMobileUser } from '@/app/api/helpers/mobile-request';
import {
  generalErrorResponse,
  successResponse,
  unauthorizedResponse,
} from '@/app/api/helpers/response';
import { NextRequest } from 'next/server';

// Itinerary = places the user has active redemptions at (must visit to claim)
// combined with businesses they follow
export async function GET(req: NextRequest) {
  try {
    const auth = await getMobileUser(req);
    if (!auth) return unauthorizedResponse();

    const now = new Date().toISOString();

    const [redemptionsResult, followsResult] = await Promise.all([
      auth.supabase
        .from('user_redemptions')
        .select(
          `
          id, expires_at, is_claimed,
          coupons(id, code, discount,
            businesses(id, shop_name, logo_url, description)
          ),
          branches(id, name, address)
        `,
        )
        .eq('user_id', auth.user.id)
        .eq('is_claimed', false)
        .or(`expires_at.is.null,expires_at.gt.${now}`)
        .order('expires_at', { ascending: true, nullsFirst: false }),

      auth.supabase
        .from('follows')
        .select(
          `
          id,
          businesses(
            id, shop_name, logo_url, description,
            coupons(id, code, discount, expiry_date, status, archived_at, start_date)
          )
        `,
        )
        .eq('user_id', auth.user.id)
        .order('created_at', { ascending: false }),
    ]);

    if (redemptionsResult.error) {
      return generalErrorResponse({ message: redemptionsResult.error.message });
    }
    if (followsResult.error) {
      return generalErrorResponse({
        message: followsResult.error.message,
      });
    }

    // Filter nested coupons to active/published only — Supabase doesn't support
    // WHERE on nested selects, so we filter in application code.
    const followedBusinesses = (followsResult.data ?? []).map((follow) => ({
      ...follow,
      businesses: follow.businesses
        ? {
            ...follow.businesses,
            coupons: (
              (
                follow.businesses as unknown as {
                  coupons: {
                    id: string;
                    code: string;
                    discount: unknown;
                    expiry_date: string;
                    status: string;
                    archived_at: string | null;
                    start_date: string;
                  }[];
                }
              ).coupons ?? []
            )
              .filter(
                (c) =>
                  c.archived_at === null &&
                  c.status === 'published' &&
                  new Date(c.start_date) <= new Date(now) &&
                  new Date(c.expiry_date) >= new Date(now),
              )
              .map(
                ({ status: _s, archived_at: _a, start_date: _sd, ...rest }) =>
                  rest,
              ),
          }
        : follow.businesses,
    }));

    return successResponse({
      active_redemptions: redemptionsResult.data,
      followed_businesses: followedBusinesses,
    });
  } catch {
    return generalErrorResponse();
  }
}
