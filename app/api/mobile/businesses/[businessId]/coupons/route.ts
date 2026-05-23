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
      .select(
        'id, code, description, discount, usage_scope, start_date, expiry_date',
      )
      .eq('business_id', businessId)
      .eq('status', 'published')
      .is('archived_at', null)
      .lte('start_date', now)
      .gte('expiry_date', now)
      .order('expiry_date', { ascending: true });

    if (error) {
      return generalErrorResponse({ message: error.message });
    }

    return successResponse({ coupons: data });
  } catch {
    return generalErrorResponse();
  }
}
