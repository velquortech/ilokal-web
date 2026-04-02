import { createServerSupabaseClient } from '@/supabase/server';
import { getCurrentUser } from '@/lib/api/getCurrentUser';
import type { ApiResponse } from '@/lib/types';
import { NextRequest, NextResponse } from 'next/server';

// GET /api/admin/subscriptions/plans - List all subscription plans (admin only)
// POST /api/admin/subscriptions/plans - Create new subscription plan (admin only)
export async function GET(
  _req: NextRequest,
): Promise<NextResponse<ApiResponse>> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        {
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'Must be logged in' },
        },
        { status: 401 },
      );
    }

    // Verify admin role
    const supabase = await createServerSupabaseClient();
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profile?.role !== 'admin') {
      return NextResponse.json(
        {
          success: false,
          error: { code: 'FORBIDDEN', message: 'Admin access required' },
        },
        { status: 403 },
      );
    }

    // Fetch all subscription plans
    const { data, error } = await supabase
      .from('subscription_plans')
      .select('*')
      .order('price', { ascending: true });

    if (error) {
      console.error('[GET /api/admin/subscriptions/plans] DB error:', error);
      return NextResponse.json(
        { success: false, error: { code: 'DB_ERROR', message: error.message } },
        { status: 500 },
      );
    }

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error(
      '[GET /api/admin/subscriptions/plans] unexpected error:',
      error,
    );
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Unexpected error while fetching subscription plans',
        },
      },
      { status: 500 },
    );
  }
}

export async function POST(
  req: NextRequest,
): Promise<NextResponse<ApiResponse>> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        {
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'Must be logged in' },
        },
        { status: 401 },
      );
    }

    // Verify admin role
    const supabase = await createServerSupabaseClient();
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profile?.role !== 'admin') {
      return NextResponse.json(
        {
          success: false,
          error: { code: 'FORBIDDEN', message: 'Admin access required' },
        },
        { status: 403 },
      );
    }

    const body = await req.json();

    // Validate required fields
    if (!body.name || typeof body.price !== 'number' || !body.interval) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'name, price, and interval are required',
          },
        },
        { status: 400 },
      );
    }

    // Insert new plan
    const { data, error } = await supabase
      .from('subscription_plans')
      .insert([
        {
          name: body.name,
          description: body.description || null,
          price: body.price,
          interval: body.interval,
          features: body.features || null,
        },
      ])
      .select()
      .single();

    if (error) {
      console.error('[POST /api/admin/subscriptions/plans] DB error:', error);
      return NextResponse.json(
        { success: false, error: { code: 'DB_ERROR', message: error.message } },
        { status: 500 },
      );
    }

    return NextResponse.json({ success: true, data }, { status: 201 });
  } catch (error) {
    console.error(
      '[POST /api/admin/subscriptions/plans] unexpected error:',
      error,
    );
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Unexpected error while creating subscription plan',
        },
      },
      { status: 500 },
    );
  }
}
