import { createServerSupabaseClient } from '@/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { createPaginatedResponse } from '@/lib/services';
import { assertAuthorized } from '@/lib/utils/assertAuthorized';

export async function GET(request: NextRequest) {
  try {
    const auth = await assertAuthorized(request, { roles: ['admin'] });
    if (!auth.authorized) return auth.error;

    const supabase = await createServerSupabaseClient();
    const { searchParams } = new URL(request.url);

    const filter = searchParams.get('filter') || 'active'; // active, archived, inactive, all
    const role = searchParams.get('role');
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '10', 10);
    const search = searchParams.get('search')?.trim() || '';
    const status = searchParams.get('status');
    const sort = searchParams.get('sort') || 'latest';

    // Validate filter parameter
    const validFilters = ['active', 'archived', 'inactive', 'all'];
    if (!validFilters.includes(filter)) {
      return NextResponse.json(
        {
          message:
            'Invalid filter parameter. Must be one of: active, archived, inactive, all',
        },
        { status: 400 },
      );
    }

    // Validate pagination params
    const validPage = Math.max(1, page);
    const validLimit = Math.min(100, Math.max(1, limit));
    const offset = (validPage - 1) * validLimit;

    // Validate role parameter if provided
    const validRoles = ['admin', 'business_owner', 'app_user'];
    if (role && !validRoles.includes(role)) {
      return NextResponse.json(
        { message: 'Invalid role parameter' },
        { status: 400 },
      );
    }

    // Validate sort parameter
    if (sort !== 'latest' && sort !== 'oldest') {
      return NextResponse.json(
        { message: 'Invalid sort parameter. Must be "latest" or "oldest"' },
        { status: 400 },
      );
    }

    // Build base query
    let countQuery = supabase
      .from('profiles')
      .select('id', { count: 'exact', head: true });

    let dataQuery = supabase.from('profiles').select();

    // Apply filter based on account status
    if (filter === 'active') {
      countQuery = countQuery.is('archived_at', null).eq('status', 'active');
      dataQuery = dataQuery.is('archived_at', null).eq('status', 'active');
    } else if (filter === 'archived') {
      countQuery = countQuery.not('archived_at', 'is', null);
      dataQuery = dataQuery.not('archived_at', 'is', null);
    } else if (filter === 'inactive') {
      countQuery = countQuery
        .is('archived_at', null)
        .in('status', ['inactive', 'suspended']);
      dataQuery = dataQuery
        .is('archived_at', null)
        .in('status', ['inactive', 'suspended']);
    }
    // If filter === 'all', no additional status/archived filters applied

    // Apply role filter if provided
    if (role) {
      countQuery = countQuery.eq('role', role);
      dataQuery = dataQuery.eq('role', role);
    }

    // Apply additional status filter if provided (overrides filter-based status)
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
        { message: 'Failed to fetch profiles' },
        { status: 400 },
      );
    }

    // Execute data query
    const dataResult = await dataQuery.range(offset, offset + validLimit - 1);

    if (dataResult.error) {
      console.error('Data query error:', dataResult.error);
      return NextResponse.json(
        { message: 'Failed to fetch profiles' },
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

/**
 * NOTE: POST/PUT/DELETE mutations are handled via Server Actions in `/app/admin/actions.ts`
 * This endpoint is read-only for data fetching only.
 * Server Actions provide better security context and error handling for mutations.
 */
