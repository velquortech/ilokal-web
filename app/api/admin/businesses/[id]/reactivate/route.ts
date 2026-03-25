/**
 * Business Reactivation API Route
 *
 * POST /api/admin/businesses/[id]/reactivate - Reactivate a suspended business
 */

import { NextRequest, NextResponse } from 'next/server';
import { assertAuthorized } from '@/lib/utils/assertAuthorized';
import { uuidSchema } from '@/lib/validation/business';
import { reactivateBusiness } from '@/lib/api/business/businessService';

// Use centralized assertAuthorized for admin checks

/**
 * POST /api/admin/businesses/[id]/reactivate
 * Reactivate a suspended business (change status back to verified)
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

    // Call service to reactivate business
    const result = await reactivateBusiness(businessId);

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
    console.error('[API] POST /api/admin/businesses/[id]/reactivate:', error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'Failed to reactivate business',
      },
      { status: 500 },
    );
  }
}
