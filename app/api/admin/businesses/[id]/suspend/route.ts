/**
 * Business Suspension API Route
 *
 * POST /api/admin/businesses/[id]/suspend - Suspend a business
 */

import { NextRequest, NextResponse } from 'next/server';
import { assertAuthorized } from '@/lib/utils/assertAuthorized';
import { uuidSchema, suspendBusinessSchema } from '@/lib/validation/business';
import { suspendBusiness } from '@/lib/api/business/businessService';

// Use centralized assertAuthorized for admin checks

/**
 * POST /api/admin/businesses/[id]/suspend
 * Suspend a business (change status to suspended)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const auth = await assertAuthorized(request, { roles: ['admin'] });
    if (!auth.authorized) return auth.error;

    // Validate ID format
    const { id } = await params;
    const { id: businessId } = uuidSchema.parse({ id });

    // Parse request body for reason
    let reason: string | undefined;
    const requiredReason = true;

    try {
      const body = await request.json();
      reason = body.reason;

      // Validate reason if provided
      if (reason) {
        suspendBusinessSchema.parse({ reason });
      }
    } catch {
      if (requiredReason) {
        return NextResponse.json(
          { error: 'Reason for suspension is required' },
          { status: 400 },
        );
      }
    }

    // Call service to suspend business
    const result = await suspendBusiness(businessId, reason);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json(
      {
        success: true,
        data: result.data,
        message: result.message,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error('[API] POST /api/admin/businesses/[id]/suspend:', error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : 'Failed to suspend business',
      },
      { status: 500 },
    );
  }
}
