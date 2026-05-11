import { createBearerClient } from '@/supabase/bearer';
import { generalErrorResponse, successResponse } from '@/app/api/helpers/response';
import { NextRequest } from 'next/server';

type Params = { params: Promise<{ businessId: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const { businessId } = await params;
    const supabase = createBearerClient();

    const { data, error } = await supabase
      .from('business_ratings')
      .select('rating')
      .eq('business_id', businessId);

    if (error) {
      return generalErrorResponse({ message: error.message });
    }

    const ratings = data ?? [];
    const total = ratings.length;
    const average =
      total > 0 ? ratings.reduce((sum, r) => sum + r.rating, 0) / total : 0;

    const distribution: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
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
