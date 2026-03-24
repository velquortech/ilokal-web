export const dynamic = 'force-dynamic';

import { NextResponse, type NextRequest } from 'next/server';
import type { ApiResponse } from '@/lib/types';
import * as notificationsService from '@/lib/api/notifications/notificationsService';
import { markReadSchema } from '@/lib/validation/notification';

export async function PUT(
  request: NextRequest,
  context: { params: { id: string } | Promise<{ id: string }> },
) {
  try {
    const params = await Promise.resolve(context.params);
    const { id } = params;
    const body = await request.json();
    const parsed = markReadSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: { code: 'VALIDATION_ERROR', message: 'Invalid payload' },
        } as ApiResponse<null>,
        { status: 400 },
      );
    }
    const result = await notificationsService.markRead(id, parsed.data.read);
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
