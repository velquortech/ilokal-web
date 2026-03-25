export const dynamic = 'force-dynamic';

import { NextResponse, type NextRequest } from 'next/server';
import { assertAuthorized } from '@/lib/utils/assertAuthorized';
import type { ApiResponse } from '@/lib/types';
import * as notificationsService from '@/lib/api/notifications/notificationsService';

export async function GET(request: NextRequest) {
  try {
    const auth = await assertAuthorized(request);
    if (!auth.authorized) return auth.error;
    const user_id = auth.user.id;
    const url = new URL(request.url);
    const page = Number(url.searchParams.get('page') ?? '1');
    const per_page = Number(url.searchParams.get('per_page') ?? '20');
    const result = await notificationsService.listNotifications(
      user_id,
      page,
      per_page,
    );
    return NextResponse.json(result, { status: result.success ? 200 : 500 });
  } catch (error) {
    console.error('[GET /api/notifications]', error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to fetch notifications',
        },
      } as ApiResponse<null>,
      { status: 500 },
    );
  }
}
