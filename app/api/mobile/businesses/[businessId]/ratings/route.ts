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

export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const { businessId } = await params;
    // A slug (`bida-ngayon`) reaching PostgREST as a `uuid` is a 22P02 and a
    // 500 for what is really "no such shop". See app/api/helpers/resourceId.ts.
    if (!isValidResourceId(businessId)) {
      return notFoundResponse({ message: 'Business not found' });
    }
    const supabase = createBearerClient();

    const { data, error } = await supabase
      .from('business_ratings')
      .select('rating')
      .eq('business_id', businessId);

    if (error) {
      return loggedServerError('mobile/businesses/[businessId]/ratings', error);
    }

    const ratings = data ?? [];
    const total = ratings.length;
    const average =
      total > 0 ? ratings.reduce((sum, r) => sum + r.rating, 0) / total : 0;

    const distribution: Record<number, number> = {
      1: 0,
      2: 0,
      3: 0,
      4: 0,
      5: 0,
    };
    ratings.forEach((r) => {
      distribution[r.rating] = (distribution[r.rating] ?? 0) + 1;
    });

    return successResponse({
      average_rating: Math.round(average * 10) / 10,
      total_ratings: total,
      rating_distribution: distribution,
    });
  } catch {
    return generalErrorResponse();
  }
}
