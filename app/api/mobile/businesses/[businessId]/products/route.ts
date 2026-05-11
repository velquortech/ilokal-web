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
      .select(
        'id, name, description, price, price_type, price_unit, image_url, is_available, ratings(rating)',
      )
      .eq('business_id', businessId)
      .eq('is_available', true)
      .is('archived_at', null)
      .order('name');

    if (error) {
      return generalErrorResponse({ message: error.message });
    }

    const products = (data ?? []).map((product) => {
      const ratingValues = (product.ratings as { rating: number }[]) ?? [];
      const total = ratingValues.length;
      const average =
        total > 0
          ? ratingValues.reduce((sum, r) => sum + r.rating, 0) / total
          : 0;
      return {
        id: product.id,
        name: product.name,
        description: product.description,
        price: product.price,
        price_type: product.price_type as string,
        price_unit: product.price_unit as string | null,
        image_url: product.image_url,
        is_available: product.is_available,
        average_rating: Math.round(average * 10) / 10,
        rating_count: total,
      };
    });

    return successResponse({ products });
  } catch {
    return generalErrorResponse();
  }
}
