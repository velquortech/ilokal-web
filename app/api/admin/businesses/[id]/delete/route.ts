/**
 * Business Deletion API Route
 *
 * DELETE /api/admin/businesses/[id]/delete - Permanently delete a business
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/config/server';
import { uuidSchema } from '@/lib/validation/business';
import { permanentlyDeleteBusiness } from '@/lib/api/business/businessService';

/**
 * Verify admin access helper
 */
async function verifyAdminAccess() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user: currentUser },
  } = await supabase.auth.getUser();

  if (!currentUser) {
    return {
      authorized: false,
      response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
    };
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', currentUser.id)
    .single();

  if (profile?.role !== 'admin') {
    return {
      authorized: false,
      response: NextResponse.json(
        { error: 'Only admins can access this endpoint' },
        { status: 403 },
      ),
    };
  }

  return { authorized: true };
}

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
    const { authorized, response } = await verifyAdminAccess();
    if (!authorized) return response;

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
        error:
          error instanceof Error ? error.message : 'Failed to delete business',
      },
      { status: 500 },
    );
  }
}
