/**
 * Business Rejection API Route
 *
 * POST /api/admin/businesses/[id]/reject - Reject a business
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/supabase/server';
import { uuidSchema } from '@/lib/validation/business';
import { rejectBusiness } from '@/lib/api/business/businessService';

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
 * POST /api/admin/businesses/[id]/reject
 * Reject a business application (change status to rejected)
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
