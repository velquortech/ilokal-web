import { createBearerClient } from '@/supabase/bearer';
import {
  generalErrorResponse,
  successResponse,
} from '@/app/api/helpers/response';
import { NextRequest } from 'next/server';

type Params = { params: Promise<{ businessId: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const { businessId } = await params;
    const supabase = createBearerClient();
    const now = new Date().toISOString();

    const { data, error } = await supabase
      .from('coupons')
      .select('id, title, description, type, start_date, end_date, redeem_time_limit_minutes')
      .eq('business_id', businessId)
      .is('archived_at', null)
      .or(`end_date.is.null,end_date.gte.${now}`)
      .order('end_date', { ascending: true });

    if (error) {
      return generalErrorResponse({ message: error.message });
    }

    return successResponse({ coupons: data });
  } catch {
    return generalErrorResponse();
  }
}
