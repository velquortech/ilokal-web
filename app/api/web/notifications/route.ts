export const dynamic = 'force-dynamic';

import { NextResponse, type NextRequest } from 'next/server';
import { assertAuthorized } from '@/lib/utils/assertAuthorized';
import type { ApiResponse } from '@/lib/types';
import * as notificationsService from '@/lib/api/notifications/notificationsService';
import { notificationListQuerySchema } from '@/lib/validation/notification';

export async function GET(request: NextRequest) {
  try {
    const auth = await assertAuthorized(request);
    if (!auth.authorized) return auth.error;
    const user_id = auth.user.id;

    const url = new URL(request.url);
    const parsed = notificationListQuerySchema.safeParse({
      cursor: url.searchParams.get('cursor') ?? undefined,
      limit: url.searchParams.get('limit') ?? undefined,
    });
    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: { code: 'VALIDATION_ERROR', message: 'Invalid query' },
        } as ApiResponse<null>,
        { status: 400 },
      );
    }

    const result = await notificationsService.listNotifications(user_id, {
      cursor: parsed.data.cursor,
      limit: parsed.data.limit,
    });
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
