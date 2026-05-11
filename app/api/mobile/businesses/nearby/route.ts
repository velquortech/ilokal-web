import { createBearerClient } from '@/supabase/bearer';
import {
  badRequestResponse,
  generalErrorResponse,
  successResponse,
} from '@/app/api/helpers/response';
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

    return successResponse({ businesses: data });
  } catch {
    return generalErrorResponse();
  }
}
