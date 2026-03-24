export const dynamic = 'force-dynamic';

import { NextResponse, type NextRequest } from 'next/server';
import type { ApiResponse } from '@/lib/types';
import * as moderationService from '@/lib/api/admin/moderationService';
import { createReportSchema } from '@/lib/validation/moderation';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = createReportSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid report payload',
          },
        } as ApiResponse<null>,
        { status: 400 },
      );
    }
    const result = await moderationService.createReport(parsed.data);
    return NextResponse.json(result, { status: result.success ? 201 : 400 });
  } catch (error) {
    console.error('[POST /api/admin/moderation/report]', error);
    return NextResponse.json(
      {
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to create report' },
      } as ApiResponse<null>,
      { status: 500 },
    );
  }
}
