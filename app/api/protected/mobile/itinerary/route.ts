import { getMobileUser } from '@/app/api/helpers/mobile-auth';
import {
  generalErrorResponse,
  successResponse,
  unauthorizedResponse,
} from '@/app/api/helpers/response';
import { NextRequest } from 'next/server';

// Itinerary = places the user has active redemptions at (must visit to claim)
// combined with businesses they follow (subscribed to)
export async function GET(req: NextRequest) {
  try {
    const auth = await getMobileUser(req);
    if (!auth) return unauthorizedResponse();

    const now = new Date().toISOString();

    const [redemptionsResult, subscriptionsResult] = await Promise.all([
      auth.supabase
        .from('user_redemptions')
        .select(
          `
          id, expires_at, is_claimed,
          coupons(id, title, type,
            businesses(id, shop_name, logo_url, description)
          ),
          branches(id, name, address)
        `,
        )
        .eq('user_id', auth.user.id)
        .eq('is_claimed', false)
        .gt('expires_at', now)
        .order('expires_at', { ascending: true }),

      auth.supabase
        .from('subscriptions')
        .select(
          `
          id,
          businesses(
            id, name, logo_url, description,
            coupons(id, title, type, end_date)
          )
        `,
        )
        .eq('user_id', auth.user.id)
        .order('created_at', { ascending: false }),
    ]);

    if (redemptionsResult.error) {
      return generalErrorResponse({ message: redemptionsResult.error.message });
    }
    if (subscriptionsResult.error) {
      return generalErrorResponse({
        message: subscriptionsResult.error.message,
      });
    }

    return successResponse({
      active_redemptions: redemptionsResult.data,
      followed_businesses: subscriptionsResult.data,
    });
  } catch {
    return generalErrorResponse();
  }
}
