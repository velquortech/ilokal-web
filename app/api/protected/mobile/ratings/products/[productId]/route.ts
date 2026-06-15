import { getMobileUser } from '@/app/api/helpers/mobile-request';
import {
  badRequestResponse,
  generalErrorResponse,
  notFoundResponse,
  successResponse,
  unauthorizedResponse,
  loggedServerError,
} from '@/app/api/helpers/response';
import { NextRequest } from 'next/server';

type Params = { params: Promise<{ productId: string }> };

export async function POST(req: NextRequest, { params }: Params) {
  try {
    const auth = await getMobileUser(req);
    if (!auth) return unauthorizedResponse();

    const { productId } = await params;
    const body = await req.json();
    const { rating, review_text } = body;

    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      return badRequestResponse({
        message: 'rating must be an integer between 1 and 5',
      });
    }

    // Verify product exists and is available
    const { data: product, error: prodError } = await auth.supabase
      .from('products')
      .select('id, business_id')
      .eq('id', productId)
      .eq('status', 'active')
      .is('archived_at', null)
      .single();

    if (prodError || !product) {
      return notFoundResponse({ message: 'Product not found' });
    }

    const { data, error } = await auth.supabase
      .from('ratings')
      .upsert(
        {
          user_id: auth.user.id,
          product_id: productId,
          business_id: product.business_id,
          rating: Math.round(rating),
          review_text: review_text ?? null,
        },
        { onConflict: 'user_id,product_id' },
      )
      .select('id, rating, review_text, created_at, updated_at')
      .single();

    if (error)
      return loggedServerError(
        'protected/mobile/ratings/products/[productId]',
        error,
      );

    return successResponse({ rating: data });
  } catch {
    return generalErrorResponse();
  }
}
