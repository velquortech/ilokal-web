import { getMobileUser } from '@/app/api/helpers/mobile-request';
import {
  badRequestResponse,
  generalErrorResponse,
  notFoundResponse,
  successResponse,
  unauthorizedResponse,
} from '@/app/api/helpers/response';
import { NextRequest } from 'next/server';

type Params = { params: Promise<{ businessId: string }> };

export async function POST(req: NextRequest, { params }: Params) {
  try {
    const auth = await getMobileUser(req);
    if (!auth) return unauthorizedResponse();

    const { businessId } = await params;
    const body = await req.json();
    const { rating, comment } = body;

    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      return badRequestResponse({
        message: 'rating must be an integer between 1 and 5',
      });
    }

    // Verify the business exists and is verified
    const { data: business, error: bizError } = await auth.supabase
      .from('businesses')
      .select('id')
      .eq('id', businessId)
      .eq('status', 'verified')
      .is('archived_at', null)
      .single();

    if (bizError || !business) {
      return notFoundResponse({ message: 'Business not found' });
    }

    const { data, error } = await auth.supabase
      .from('business_ratings')
      .upsert(
        {
          user_id: auth.user.id,
          business_id: businessId,
          rating: Math.round(rating),
          comment: comment ?? null,
        },
        { onConflict: 'user_id,business_id' },
      )
      .select('id, rating, comment, created_at, updated_at')
      .single();

    if (error) return generalErrorResponse({ message: error.message });

    return successResponse({ rating: data });
  } catch {
    return generalErrorResponse();
  }
}
