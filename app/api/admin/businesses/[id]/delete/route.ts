/**
 * Business Deletion API Route
 *
 * DELETE /api/admin/businesses/[id]/delete - Permanently delete a business
 */

import { NextRequest, NextResponse } from 'next/server';
import { assertAuthorized } from '@/lib/utils/assertAuthorized';
import { uuidSchema } from '@/lib/validation/business';
import { permanentlyDeleteBusiness } from '@/lib/api/business/businessService';

// Use centralized assertAuthorized for admin checks

/**
 * DELETE /api/admin/businesses/[id]/delete
 * Permanently delete a business (hard delete - irreversible)
 * WARNING: This cannot be undone
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const auth = await assertAuthorized(request, { roles: ['admin'] });
    if (!auth.authorized) return auth.error;

    // Validate ID format
    const { id } = await params;
    const { id: businessId } = uuidSchema.parse({ id });

    // Call service to permanently delete business
    const result = await permanentlyDeleteBusiness(businessId);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json(
      {
        success: true,
        message: result.message,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error('[API] DELETE /api/admin/businesses/[id]/delete:', error);
    return NextResponse.json(
      {
        error: 'Failed to delete business',
      },
      { status: 500 },
    );
  }
}
