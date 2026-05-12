import { createServerSupabaseClient } from '@/supabase/server';
import { getCurrentUser } from '@/lib/api/getCurrentUser';
import type { ApiResponse, Rating } from '@/lib/types';
import { createRatingSchema } from '@/lib/validation/ratings';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(
  req: NextRequest,
): Promise<NextResponse<ApiResponse<Rating>>> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        {
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'Must be logged in to rate' },
        },
        { status: 401 },
      );
    }

    const body = await req.json();
    const validation = createRatingSchema.safeParse(body);
    if (!validation.success) {
      const fieldErrors = validation.error.flatten().fieldErrors;
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message:
              Object.values(fieldErrors)[0]?.[0] || 'Invalid rating data',
          },
        },
        { status: 400 },
      );
    }

    const supabase = await createServerSupabaseClient();
    const { data, error } = await supabase
      .from('ratings')
      .insert([
        {
          user_id: user.id,
          product_id: validation.data.product_id || null,
          business_id: validation.data.business_id || null,
          rating: validation.data.rating,
          review_text: validation.data.review_text || null,
        },
      ])
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        // Unique constraint (if we add it later)
        return NextResponse.json(
          {
            success: false,
            error: {
              code: 'DUPLICATE_RATING',
              message: 'You have already rated this item',
            },
          },
          { status: 409 },
        );
      }
      console.error('[POST /api/ratings] DB error:', error);
      return NextResponse.json(
        { success: false, error: { code: 'DB_ERROR', message: error.message } },
        { status: 500 },
      );
    }

    return NextResponse.json({ success: true, data: data as Rating });
  } catch (error) {
    console.error('[POST /api/ratings] unexpected error:', error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Unexpected error while creating rating',
        },
      },
      { status: 500 },
    );
  }
}

export async function GET(
  req: NextRequest,
): Promise<NextResponse<ApiResponse<Rating[]>>> {
  try {
    const productId = req.nextUrl.searchParams.get('product_id');
    const businessId = req.nextUrl.searchParams.get('business_id');
    const limit = Math.min(
      parseInt(req.nextUrl.searchParams.get('limit') || '50'),
      100,
    );
    const offset = Math.max(
      parseInt(req.nextUrl.searchParams.get('offset') || '0'),
      0,
    );

    const supabase = await createServerSupabaseClient();
    let query = supabase.from('ratings').select('*', { count: 'exact' });

    if (productId) {
      query = query.eq('product_id', productId);
    }

    if (businessId) {
      query = query.eq('business_id', businessId);
    }

    const { data, error } = await query
      .is('archived_at', null)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error('[GET /api/ratings] DB error:', error);
      return NextResponse.json(
        { success: false, error: { code: 'DB_ERROR', message: error.message } },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      data: (data || []) as Rating[],
    });
  } catch (error) {
    console.error('[GET /api/ratings] unexpected error:', error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Unexpected error while fetching ratings',
        },
      },
      { status: 500 },
    );
  }
}
