export const dynamic = 'force-dynamic';

import { NextResponse, type NextRequest } from 'next/server';
import type { ApiResponse } from '@/lib/types';
import * as moderationService from '@/lib/api/admin/moderationService';
import { warnSchema } from '@/lib/validation/moderation';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const { id } = params;
    const body = await request.json();
    const parsed = warnSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: { code: 'VALIDATION_ERROR', message: 'Invalid warn payload' },
        } as ApiResponse<null>,
        { status: 400 },
      );
    }
    const { target_type, message } = parsed.data;
    const result = await moderationService.warn(target_type, id, message);
    return NextResponse.json(result, { status: result.success ? 200 : 400 });
  } catch (error) {
    console.error('[POST /api/admin/moderation/:id/warn]', error);
    return NextResponse.json(
      {
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to send warning' },
      } as ApiResponse<null>,
      { status: 500 },
    );
  }
}
