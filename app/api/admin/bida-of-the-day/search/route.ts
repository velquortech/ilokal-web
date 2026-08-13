export const dynamic = 'force-dynamic';

import { NextResponse, type NextRequest } from 'next/server';
import { assertAuthorized } from '@/lib/utils/assertAuthorized';
import type { ApiResponse } from '@/lib/types';
import * as bidaService from '@/lib/api/admin/bidaOfTheDayService';

/**
 * GET /api/admin/bida-of-the-day/search?q=… — product picker search
 * (matches product name OR owning business's shop name).
 *
 * Admin-guarded. Empty `q` returns an empty list, not everything.
 */
export async function GET(request: NextRequest) {
  try {
    const auth = await assertAuthorized(request, { roles: ['admin'] });
    if (!auth.authorized) return auth.error;

    const q = (request.nextUrl.searchParams.get('q') ?? '')
      .trim()
      .slice(0, 100);
    const result = await bidaService.findBidaProducts(q);
    return NextResponse.json(result, { status: result.success ? 200 : 500 });
  } catch (error) {
    console.error('[GET /api/admin/bida-of-the-day/search]', error);
    return NextResponse.json(
      {
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Product search failed' },
      } as ApiResponse<null>,
      { status: 500 },
    );
  }
}
