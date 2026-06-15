import { getMobileUser } from '@/app/api/helpers/mobile-request';
import {
  generalErrorResponse,
  successResponse,
  unauthorizedResponse,
  loggedServerError,
} from '@/app/api/helpers/response';
import { NextRequest } from 'next/server';

type Params = { params: Promise<{ productId: string }> };

// Record a product sheet open — the product twin of
// /mobile/businesses/:id/view. Same daily per-user dedupe via record_view.
export async function POST(req: NextRequest, { params }: Params) {
  try {
    const auth = await getMobileUser(req);
    if (!auth) return unauthorizedResponse();

    const { productId } = await params;

    const { error } = await auth.supabase.rpc('record_view', {
      p_product_id: productId,
    });

    if (error)
      return loggedServerError('mobile/products/[productId]/view', error);

    return successResponse({ message: 'View recorded' });
  } catch {
    return generalErrorResponse();
  }
}
