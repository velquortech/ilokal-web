import { createBearerClient } from '@/supabase/bearer';
import {
  badRequestResponse,
  generalErrorResponse,
  successResponse,
} from '@/app/api/helpers/response';
import { resolveStorageUrl } from '@/app/api/helpers/storage';
import { NextRequest } from 'next/server';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl;
    const lat = parseFloat(searchParams.get('lat') ?? '');
    const lng = parseFloat(searchParams.get('lng') ?? '');
    const radius = parseInt(searchParams.get('radius') ?? '5000', 10);

    if (isNaN(lat) || isNaN(lng)) {
      return badRequestResponse({ message: 'lat and lng query params are required' });
    }

    const supabase = createBearerClient();

    const { data, error } = await supabase.rpc('nearby_businesses', {
      lat,
      lng,
      radius_meters: radius,
    });

    if (error) {
      return generalErrorResponse({ message: error.message });
    }

    const businesses = data.map((b: Record<string, unknown>) => ({
      ...b,
      logo_url: resolveStorageUrl(supabase, 'shop-logos', b.logo_url as string | null),
      interior_images: (b.interior_images as string[] | null)?.map((url) =>
        resolveStorageUrl(supabase, 'interior-images', url),
      ) ?? [],
    }));

    return successResponse({ businesses });
  } catch {
    return generalErrorResponse();
  }
}
