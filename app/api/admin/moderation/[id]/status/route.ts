export const dynamic = 'force-dynamic';

import { NextResponse, type NextRequest } from 'next/server';
import type { ApiResponse } from '@/lib/types';
import * as moderationService from '@/lib/api/admin/moderationService';
import { moderationActionSchema } from '@/lib/validation/moderation';

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const { id } = params;
    const body = await request.json();
    const parsed = moderationActionSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid action payload',
          },
        } as ApiResponse<null>,
        { status: 400 },
      );
    }
    const status =
      parsed.data.action === 'approve'
        ? 'actioned'
        : parsed.data.action === 'reject'
          ? 'rejected'
          : 'reviewed';
    const result = await moderationService.actionOnReport(
      id,
      status,
      parsed.data.comment,
    );
    return NextResponse.json(result, { status: result.success ? 200 : 400 });
  } catch (error) {
    console.error('[PUT /api/admin/moderation/:id/status]', error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to update report status',
        },
      } as ApiResponse<null>,
      { status: 500 },
    );
  }
}
