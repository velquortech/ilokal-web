/**
 * Business Rejection API Route
 *
 * POST /api/admin/businesses/[id]/reject - Reject a business
 */

import { NextRequest, NextResponse } from 'next/server';
import { assertAuthorized } from '@/lib/utils/assertAuthorized';
import { uuidSchema } from '@/lib/validation/business';
import { rejectBusiness } from '@/lib/api/business/businessService';

// Use centralized assertAuthorized for admin checks

/**
 * POST /api/admin/businesses/[id]/reject
 * Reject a business application (change status to rejected)
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

    // Parse optional request body for reason
    let reason: string | undefined;
    try {
      const body = await request.json();
      reason = body.reason;
    } catch {
      // No body provided, that's okay
    }

    // Call service to reject business
    const result = await rejectBusiness(businessId, reason);

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
    console.error('[API] POST /api/admin/businesses/[id]/reject:', error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : 'Failed to reject business',
      },
      { status: 500 },
    );
  }
}
