import { createBearerClient } from '@/supabase/bearer';
import {
  generalErrorResponse,
  notFoundResponse,
  successResponse,
} from '@/app/api/helpers/response';
import { resolveStorageUrl } from '@/app/api/helpers/storage';
import { NextRequest } from 'next/server';

type Params = { params: Promise<{ businessId: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const { businessId } = await params;
    const supabase = createBearerClient();

    const { data, error } = await supabase
      .from('businesses')
      .select(`
        id, shop_name, description, logo_url, interior_images, status,
        branches(id, name, address)
      `)
      .eq('id', businessId)
      .eq('status', 'verified')
      .is('archived_at', null)
      .single();

    if (error || !data) {
      return notFoundResponse({ message: 'Business not found' });
    }

    const business = {
      ...data,
      logo_url: resolveStorageUrl(supabase, 'shop-logos', data.logo_url),
      interior_images: data.interior_images?.map((url: string) =>
        resolveStorageUrl(supabase, 'interior-images', url),
      ) ?? [],
    };

    return successResponse({ business });
  } catch {
    return generalErrorResponse();
  }
}
