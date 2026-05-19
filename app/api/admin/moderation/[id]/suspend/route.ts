export const dynamic = 'force-dynamic';

import { NextResponse, type NextRequest } from 'next/server';
import { assertAuthorized } from '@/lib/utils/assertAuthorized';
import type { ApiResponse } from '@/lib/types';
import * as moderationService from '@/lib/api/admin/moderationService';
import { suspendSchema } from '@/lib/validation/moderation';

export async function POST(
  request: NextRequest,
  context: { params: { id: string } | Promise<{ id: string }> },
) {
  try {
    const auth = await assertAuthorized(request, { roles: ['admin'] });
    if (!auth.authorized) return auth.error;

    const params = await Promise.resolve(context.params);
    const { id } = params;
    const body = await request.json();
    const parsed = suspendSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid suspend payload',
          },
        } as ApiResponse<null>,
        { status: 400 },
      );
    }
    // target_id comes from params.id
    const { target_type, reason, until } = parsed.data;
    const result = await moderationService.suspend(
      target_type,
      id,
      reason ?? undefined,
      until ?? undefined,
    );
    return NextResponse.json(result, { status: result.success ? 200 : 400 });
  } catch (error) {
    console.error('[POST /api/admin/moderation/:id/suspend]', error);
    return NextResponse.json(
      {
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to suspend entity' },
      } as ApiResponse<null>,
      { status: 500 },
    );
  }
}
