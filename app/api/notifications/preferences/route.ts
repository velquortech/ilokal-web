export const dynamic = 'force-dynamic';

import { NextResponse, type NextRequest } from 'next/server';
import type { ApiResponse } from '@/lib/types';
import * as notificationsService from '@/lib/api/notifications/notificationsService';
import { notificationPreferencesSchema } from '@/lib/validation/notification';

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const user_id = url.searchParams.get('user_id') || '';
    const result = await notificationsService.getPreferences(user_id);
    return NextResponse.json(result, { status: result.success ? 200 : 500 });
  } catch (error) {
    console.error('[GET /api/notifications/preferences]', error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to fetch preferences',
        },
      } as ApiResponse<null>,
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = notificationPreferencesSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: { code: 'VALIDATION_ERROR', message: 'Invalid payload' },
        } as ApiResponse<null>,
        { status: 400 },
      );
    }
    const user_id = (body as { user_id?: string }).user_id ?? '';
    const result = await notificationsService.upsertPreferences(
      user_id,
      parsed.data,
    );
    return NextResponse.json(result, { status: result.success ? 200 : 400 });
  } catch (error) {
    console.error('[POST /api/notifications/preferences]', error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to save preferences',
        },
      } as ApiResponse<null>,
      { status: 500 },
    );
  }
}
