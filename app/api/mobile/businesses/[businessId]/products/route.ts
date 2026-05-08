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

    const { data, error } = await supabase
      .from('products')
      .select('id, name, description, price, image_url, is_available')
      .eq('business_id', businessId)
      .eq('is_available', true)
      .is('archived_at', null)
      .order('name');

    if (error) {
      return generalErrorResponse({ message: error.message });
    }

    return successResponse({ products: data });
  } catch {
    return generalErrorResponse();
  }
}
