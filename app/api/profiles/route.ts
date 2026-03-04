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
    const search = searchParams.get('search')?.trim() || '';
    const status = searchParams.get('status');
    const sort = searchParams.get('sort') || 'latest';

    // Validate pagination params
    const validPage = Math.max(1, page);
    const validLimit = Math.min(100, Math.max(1, limit));
    const offset = (validPage - 1) * validLimit;

    // Build base query
    let countQuery = supabase
      .from('profiles')
      .select('id', { count: 'exact', head: true });

    let dataQuery = supabase.from('profiles').select();

    // Apply equality filters
    if (role) {
      countQuery = countQuery.eq('role', role);
      dataQuery = dataQuery.eq('role', role);
    }

    if (status && status !== 'all') {
      countQuery = countQuery.eq('status', status);
      dataQuery = dataQuery.eq('status', status);
    }

    // Apply search filter (search in full_name or email)
    if (search) {
      // Escape special characters for Supabase/PostgREST pattern matching
      const escapedSearch = search
        .replace(/\\/g, '\\\\') // Escape backslashes first
        .replace(/"/g, '\\"') // Escape double quotes
        .replace(/'/g, "''") // Escape single quotes for SQL
        .replace(/%/g, '\\%') // Escape LIKE wildcard %
        .replace(/_/g, '\\_'); // Escape LIKE wildcard _

      // Wrap pattern in double quotes so commas/parentheses are treated as literals
      const likePattern = `"%${escapedSearch}%"`;

      countQuery = countQuery.or(
        `full_name.ilike.${likePattern},email.ilike.${likePattern}`,
      );
      dataQuery = dataQuery.or(
        `full_name.ilike.${likePattern},email.ilike.${likePattern}`,
      );
    }

    // Apply sorting
    if (sort === 'oldest') {
      dataQuery = dataQuery.order('created_at', { ascending: true });
    } else {
      dataQuery = dataQuery.order('created_at', { ascending: false });
    }

    // Execute count query
    const countResult = await countQuery;
    const totalItems = countResult.count || 0;

    if (countResult.error) {
      console.error('Count query error:', countResult.error);
      return NextResponse.json(
        { message: countResult.error.message },
        { status: 400 },
      );
    }

    // Execute data query
    const dataResult = await dataQuery.range(offset, offset + validLimit - 1);

    if (dataResult.error) {
      console.error('Data query error:', dataResult.error);
      return NextResponse.json(
        { message: dataResult.error.message },
        { status: 400 },
      );
    }

    // Create and return paginated response
    const paginatedResponse = createPaginatedResponse(
      dataResult.data || [],
      validPage,
      validLimit,
      totalItems,
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
