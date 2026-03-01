import { createServerSupabaseClient } from '@/config/server';
import { NextRequest, NextResponse } from 'next/server';
import { createPaginatedResponse } from '@/lib/api/paginationService';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { searchParams } = new URL(request.url);
    const role = searchParams.get('role');
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '10', 10);

    // Validate pagination params
    const validPage = Math.max(1, page);
    const validLimit = Math.min(100, Math.max(1, limit));
    const offset = (validPage - 1) * validLimit;

    if (role) {
      // Get total count
      const { count: totalItems, error: countError } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('role', role);

      if (countError) {
        return NextResponse.json(
          { message: countError.message },
          { status: 400 },
        );
      }

      // Get paginated data
      const { data, error } = await supabase
        .from('profiles')
        .select()
        .eq('role', role)
        .range(offset, offset + validLimit - 1);

      if (error) {
        return NextResponse.json({ message: error.message }, { status: 400 });
      }

      const paginatedResponse = createPaginatedResponse(
        data || [],
        validPage,
        validLimit,
        totalItems || 0,
      );

      return NextResponse.json(paginatedResponse);
    }

    // Get total count for all profiles
    const { count: totalItems, error: countError } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true });

    if (countError) {
      return NextResponse.json(
        { message: countError.message },
        { status: 400 },
      );
    }

    // Get paginated data for all profiles
    const { data, error } = await supabase
      .from('profiles')
      .select()
      .range(offset, offset + validLimit - 1);

    if (error) {
      return NextResponse.json({ message: error.message }, { status: 400 });
    }

    const paginatedResponse = createPaginatedResponse(
      data || [],
      validPage,
      validLimit,
      totalItems || 0,
    );

    return NextResponse.json(paginatedResponse);
  } catch (error) {
    console.error('Profile fetch error:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const body = await request.json();

    const { data, error } = await supabase
      .from('profiles')
      .insert(body)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ message: error.message }, { status: 400 });
    }

    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    console.error('Profile creation error:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 },
    );
  }
}
