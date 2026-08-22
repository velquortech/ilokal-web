import { createBearerClient } from '@/supabase/bearer';
import {
  generalErrorResponse,
  successResponse,
  loggedServerError,
  notFoundResponse,
} from '@/app/api/helpers/response';
import { isValidResourceId } from '@/app/api/helpers/resourceId';
import { NextRequest } from 'next/server';

type Params = { params: Promise<{ businessId: string }> };

// Public coupon list — cache per businessId, short 60s window so newly published
// or expired coupons surface quickly while cutting repeat PostgREST reads. (P10)
export const revalidate = 60;

export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const { businessId } = await params;
    // A slug (`bida-ngayon`) reaching PostgREST as a `uuid` is a 22P02 and a
    // 500 for what is really "no such shop". See app/api/helpers/resourceId.ts.
    if (!isValidResourceId(businessId)) {
      return notFoundResponse({ message: 'Business not found' });
    }
    const supabase = createBearerClient();
    const now = new Date().toISOString();

    const { data, error } = await supabase
      .from('coupons')
      .select(
        'id, code, description, discount, usage_scope, promotion_type, start_date, expiry_date',
      )
      .eq('business_id', businessId)
      .eq('status', 'published')
      .is('archived_at', null)
      .lte('start_date', now)
      .gte('expiry_date', now)
      .order('expiry_date', { ascending: true });

    if (error) {
      return loggedServerError('mobile/businesses/[businessId]/coupons', error);
    }

    return successResponse({ coupons: data });
  } catch {
    return generalErrorResponse();
  }
}
