export const dynamic = 'force-dynamic';

import { NextResponse, type NextRequest } from 'next/server';
import type { ApiResponse } from '@/lib/types';
import { assertAuthorized } from '@/lib/utils/assertAuthorized';
import * as notificationsService from '@/lib/api/notifications/notificationsService';
import { markNotificationReadSchema } from '@/lib/validation/notification';

export async function PUT(
  request: NextRequest,
  context: { params: { id: string } | Promise<{ id: string }> },
) {
  try {
    const auth = await assertAuthorized(request);
    if (!auth.authorized) return auth.error;

    const params = await Promise.resolve(context.params);
    const parsed = markNotificationReadSchema.safeParse(params);
    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid notification id',
          },
        } as ApiResponse<null>,
        { status: 400 },
      );
    }
    // RLS guarantees the row belongs to the caller.
    const result = await notificationsService.markRead(parsed.data.id);
    return NextResponse.json(result, { status: result.success ? 200 : 400 });
  } catch (error) {
    console.error('[PUT /api/notifications/:id]', error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to update notification',
        },
      } as ApiResponse<null>,
      { status: 500 },
    );
  }
}
