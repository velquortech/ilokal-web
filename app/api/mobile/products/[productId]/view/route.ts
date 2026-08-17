import { getMobileUser } from '@/app/api/helpers/mobile-request';
import {
  generalErrorResponse,
  successResponse,
  unauthorizedResponse,
  loggedServerError,
  notFoundResponse,
} from '@/app/api/helpers/response';
import { productIdSchema } from '@/lib/validation/products';
import { NextRequest } from 'next/server';

type Params = { params: Promise<{ productId: string }> };

// Record a product sheet open — the product twin of
// /mobile/businesses/:id/view. Same daily per-user dedupe via record_view.
export async function POST(req: NextRequest, { params }: Params) {
  try {
    const auth = await getMobileUser(req);
    if (!auth) return unauthorizedResponse();

    const { productId } = await params;

    // A malformed id raises 22P02 inside the RPC, which would be a REPORTED
    // 500 on every such request — same rule as the business view route. Reject
    // it in the shape check instead, where it costs nothing.
    if (!productIdSchema.safeParse(productId).success) {
      return notFoundResponse();
    }

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
