/**
 * Business Reactivation API Route
 *
 * POST /api/admin/businesses/[id]/reactivate - Reactivate a suspended business
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/supabase/server';
import { uuidSchema } from '@/lib/validation/business';
import { reactivateBusiness } from '@/lib/api/business/businessService';

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
 * POST /api/admin/businesses/[id]/reactivate
 * Reactivate a suspended business (change status back to verified)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { authorized, response } = await verifyAdminAccess();
    if (!authorized) return response;

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
