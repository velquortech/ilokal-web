export const dynamic = 'force-dynamic';

import { NextResponse, type NextRequest } from 'next/server';
import { assertAuthorized } from '@/lib/utils/assertAuthorized';
import type { ApiResponse } from '@/lib/types';
import * as moderationService from '@/lib/api/admin/moderationService';

export async function GET(request: NextRequest) {
  try {
    const auth = await assertAuthorized(request, { roles: ['admin'] });
    if (!auth.authorized) return auth.error;

    const url = new URL(request.url);
    const page = Number(url.searchParams.get('page') ?? '1');
    const per_page = Number(url.searchParams.get('per_page') ?? '20');
    const result = await moderationService.getReports(page, per_page);
    return NextResponse.json(result, { status: result.success ? 200 : 500 });
  } catch (error) {
    console.error('[GET /api/admin/moderation/reports]', error);
    return NextResponse.json(
      {
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch reports' },
      } as ApiResponse<null>,
      { status: 500 },
    );
  }
}
