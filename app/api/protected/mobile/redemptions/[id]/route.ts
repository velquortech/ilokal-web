import { getMobileUser } from '@/app/api/helpers/mobile-request';
import {
  generalErrorResponse,
  notFoundResponse,
  successResponse,
  unauthorizedResponse,
} from '@/app/api/helpers/response';
import { NextRequest } from 'next/server';

type Params = { params: Promise<{ id: string }> };

// Single redemption by id — lets the mobile redemption screen fetch its own
// data from just an `id` (instead of threading 7 flat params through navigation,
// which had already drifted between the two call sites). Same enriched shape as
// the listing in ../route.ts so the client reuses one normalizer. Scoped to the
// owner via user_id, so one user can't read another's redemption.
export async function GET(req: NextRequest, { params }: Params) {
  try {
    const auth = await getMobileUser(req);
    if (!auth) return unauthorizedResponse();

    const { id } = await params;

    const { data, error } = await auth.supabase
      .from('user_redemptions')
      .select(
        `
        id, redeemed_at, expires_at, is_claimed, code,
        coupons(id, code, description, discount, expiry_date, promotion_type,
          businesses(id, shop_name, logo_url)
        ),
        branches(id, name, address)
      `,
      )
      .eq('id', id)
      .eq('user_id', auth.user.id)
      .maybeSingle();

    if (error) return generalErrorResponse({ message: error.message });
    if (!data) return notFoundResponse({ message: 'Redemption not found' });

    return successResponse({ redemption: data });
  } catch {
    return generalErrorResponse();
  }
}
