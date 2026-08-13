export const dynamic = 'force-dynamic';

import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { assertAuthorized } from '@/lib/utils/assertAuthorized';
import type { ApiResponse } from '@/lib/types';
import * as bidaService from '@/lib/api/admin/bidaOfTheDayService';

const upsertSchema = z.object({
  pick_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'pick_date must be YYYY-MM-DD'),
  // `z.guid()` and NOT `z.uuid()`: Zod 4's `uuid()` is strict RFC-9562 and
  // rejects this app's own Postgres/seed UUIDs (CLAUDE.md §Validation).
  product_id: z.guid('product_id must be a UUID'),
  note: z.string().trim().max(500).nullable().optional(),
});

const deleteSchema = z.object({
  pick_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'pick_date must be YYYY-MM-DD'),
});

/**
 * GET /api/admin/bida-of-the-day — scheduled editorial picks (newest first).
 * POST  — upsert a pick for a date (one row per pick_date; re-picking the same
 *         date replaces it). DELETE — unset the pick for a date.
 *
 * Admin-guarded (`assertAuthorized` roles: admin). The mobile board consumes
 * the most recent pick ≤ today via the `bida_of_the_day` RPC, so future dates
 * are pre-scheduled picks that go live at midnight.
 */
export async function GET(request: NextRequest) {
  try {
    const auth = await assertAuthorized(request, { roles: ['admin'] });
    if (!auth.authorized) return auth.error;

    const result = await bidaService.getBidaPicks();
    return NextResponse.json(result, { status: result.success ? 200 : 500 });
  } catch (error) {
    console.error('[GET /api/admin/bida-of-the-day]', error);
    return NextResponse.json(
      {
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to load Bida picks' },
      } as ApiResponse<null>,
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await assertAuthorized(request, { roles: ['admin'] });
    if (!auth.authorized) return auth.error;

    const parsed = upsertSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: parsed.error.issues[0]?.message ?? 'Invalid input',
          },
        } as ApiResponse<null>,
        { status: 400 },
      );
    }

    const result = await bidaService.createBidaPick(parsed.data);
    return NextResponse.json(result, { status: result.success ? 200 : 400 });
  } catch (error) {
    console.error('[POST /api/admin/bida-of-the-day]', error);
    return NextResponse.json(
      {
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to save the pick' },
      } as ApiResponse<null>,
      { status: 500 },
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const auth = await assertAuthorized(request, { roles: ['admin'] });
    if (!auth.authorized) return auth.error;

    const parsed = deleteSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: parsed.error.issues[0]?.message ?? 'Invalid input',
          },
        } as ApiResponse<null>,
        { status: 400 },
      );
    }

    const result = await bidaService.removeBidaPick(parsed.data.pick_date);
    return NextResponse.json(result, { status: result.success ? 200 : 500 });
  } catch (error) {
    console.error('[DELETE /api/admin/bida-of-the-day]', error);
    return NextResponse.json(
      {
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to remove the pick' },
      } as ApiResponse<null>,
      { status: 500 },
    );
  }
}
