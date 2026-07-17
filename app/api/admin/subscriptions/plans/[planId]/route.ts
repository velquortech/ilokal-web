import { createServerSupabaseClient } from '@/supabase/server';
import { getCurrentUser } from '@/lib/api/getCurrentUser';
import type { ApiResponse } from '@/lib/types';
import { NextRequest, NextResponse } from 'next/server';

// GET /api/admin/subscriptions/plans/[planId] - Get plan details (admin only)
// PUT /api/admin/subscriptions/plans/[planId] - Update plan (admin only)
// DELETE /api/admin/subscriptions/plans/[planId] - Delete plan (admin only)

async function verifyAdminAccess(
  user: { id?: string } | null,
): Promise<{ authorized: boolean; message: string } | { authorized: true }> {
  if (!user) {
    return { authorized: false, message: 'Must be logged in' };
  }

  const supabase = await createServerSupabaseClient();
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (profile?.role !== 'admin') {
    return { authorized: false, message: 'Admin access required' };
  }

  return { authorized: true };
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ planId: string }> },
): Promise<NextResponse<ApiResponse>> {
  try {
    const { planId } = await params;
    const user = await getCurrentUser();
    const authCheck = await verifyAdminAccess(user);
    if (!authCheck.authorized) {
      return NextResponse.json(
        {
          success: false,
          error: { code: 'FORBIDDEN', message: authCheck.message },
        },
        { status: 403 },
      );
    }

    const supabase = await createServerSupabaseClient();
    const { data, error } = await supabase
      .from('subscription_plans')
      .select('*')
      .eq('id', planId)
      .single();

    if (error || !data) {
      return NextResponse.json(
        {
          success: false,
          error: { code: 'NOT_FOUND', message: 'Subscription plan not found' },
        },
        { status: 404 },
      );
    }

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error(
      '[GET /api/admin/subscriptions/plans/[id]] unexpected error:',
      error,
    );
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Unexpected error while fetching subscription plan',
        },
      },
      { status: 500 },
    );
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ planId: string }> },
): Promise<NextResponse<ApiResponse>> {
  try {
    const { planId } = await params;
    const user = await getCurrentUser();
    const authCheck = await verifyAdminAccess(user);
    if (!authCheck.authorized) {
      return NextResponse.json(
        {
          success: false,
          error: { code: 'FORBIDDEN', message: authCheck.message },
        },
        { status: 403 },
      );
    }

    const body = await req.json();

    const supabase = await createServerSupabaseClient();
    const { data, error } = await supabase
      .from('subscription_plans')
      .update({
        name: body.name,
        description: body.description,
        price: body.price,
        interval: body.interval,
        features: body.features,
        updated_at: new Date().toISOString(),
      })
      .eq('id', planId)
      .select()
      .single();

    if (error || !data) {
      return NextResponse.json(
        {
          success: false,
          error: { code: 'NOT_FOUND', message: 'Subscription plan not found' },
        },
        { status: 404 },
      );
    }

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error(
      '[PUT /api/admin/subscriptions/plans/[id]] unexpected error:',
      error,
    );
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Unexpected error while updating subscription plan',
        },
      },
      { status: 500 },
    );
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ planId: string }> },
): Promise<NextResponse<ApiResponse>> {
  try {
    const { planId } = await params;
    const user = await getCurrentUser();
    const authCheck = await verifyAdminAccess(user);
    if (!authCheck.authorized) {
      return NextResponse.json(
        {
          success: false,
          error: { code: 'FORBIDDEN', message: authCheck.message },
        },
        { status: 403 },
      );
    }

    const supabase = await createServerSupabaseClient();

    // Check if any active subscriptions use this plan (head-only count — no
    // row payload needed)
    const { count } = await supabase
      .from('business_subscriptions')
      .select('id', { count: 'exact', head: true })
      .eq('plan_id', planId)
      .eq('status', 'active');

    if ((count || 0) > 0) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'CONFLICT',
            message: 'Cannot delete plan with active subscriptions',
          },
        },
        { status: 409 },
      );
    }

    // Delete the plan
    const { error } = await supabase
      .from('subscription_plans')
      .delete()
      .eq('id', planId);

    if (error) {
      return NextResponse.json(
        {
          success: false,
          error: { code: 'NOT_FOUND', message: 'Subscription plan not found' },
        },
        { status: 404 },
      );
    }

    return NextResponse.json({
      success: true,
      data: { deleted: true, id: planId },
    });
  } catch (error) {
    console.error(
      '[DELETE /api/admin/subscriptions/plans/[id]] unexpected error:',
      error,
    );
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Unexpected error while deleting subscription plan',
        },
      },
      { status: 500 },
    );
  }
}
