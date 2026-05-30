import { createBearerClient } from '@/supabase/bearer';
import {
  generalErrorResponse,
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
      .from('products')
      .select(
        'id, name, description, price, sale_price, price_type, price_unit, image_url, is_available, categories(id, name, slug), ratings(rating)',
      )
      .eq('business_id', businessId)
      .eq('is_available', true)
      .eq('status', 'active')
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
          : null;
      return {
        id: product.id,
        name: product.name,
        description: product.description,
        price: product.price,
        sale_price: product.sale_price ?? null,
        price_type: product.price_type as string,
        price_unit: product.price_unit as string | null,
        image_url: resolveStorageUrl(
          supabase,
          'product-images',
          product.image_url,
        ),
        is_available: product.is_available,
        category: product.categories ?? null,
        average_rating: average !== null ? Math.round(average * 10) / 10 : null,
        rating_count: total,
      };
    });

    return successResponse({ products });
  } catch {
    return generalErrorResponse();
  }
}
