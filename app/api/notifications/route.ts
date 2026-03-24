export const dynamic = 'force-dynamic';

import { NextResponse, type NextRequest } from 'next/server';
import type { ApiResponse } from '@/lib/types';
import * as notificationsService from '@/lib/api/notifications/notificationsService';

export async function GET(request: NextRequest) {
  try {
    // For now, expect user_id in query for tests; in real app use auth session
    const url = new URL(request.url);
    const user_id = url.searchParams.get('user_id') || '';
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
