import { createServerSupabaseClient } from '@/config/server';
import { NextRequest, NextResponse } from 'next/server';
import { createPaginatedResponse } from '@/services/api/paginationService';
import { verifyAdminAccess } from '@/lib/api/verifyAdminAccess';

export async function GET(request: NextRequest) {
  try {
    const { authorized, error } = await verifyAdminAccess(request);
    if (!authorized) return error;

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

    // Validate role parameter if provided
    const validRoles = ['admin', 'business_owner', 'user'];
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
    const { authorized, error } = await verifyAdminAccess(request);
    if (!authorized) return error;

    const supabase = await createServerSupabaseClient();
    const adminSupabase = await createClient();
    const body = await request.json();

    const { email, password, full_name, role, phone_number, avatar_url } = body;

    // Validate required fields for user creation
    if (!email || !password || !full_name || !role) {
      return NextResponse.json(
        {
          message: 'Missing required fields: email, password, full_name, role',
        },
        { status: 400 },
      );
    }

    // Create auth user first with admin client
    const { data: authData, error: authError } =
      await adminSupabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true, // Auto-confirm email
      });

    if (authError) {
      return NextResponse.json({ message: authError.message }, { status: 400 });
    }

    if (!authData.user) {
      return NextResponse.json(
        { message: 'Failed to create auth user' },
        { status: 400 },
      );
    }

    // Create profile record
    const profileData: Record<string, unknown> = {
      id: authData.user.id,
      email,
      full_name,
      role,
      status: 'active',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    if (phone_number) {
      profileData.phone_number = phone_number;
    }

    if (avatar_url) {
      profileData.avatar_url = avatar_url;
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .insert(profileData)
      .select()
      .single();

    if (profileError) {
      // Clean up auth user if profile creation fails
      await adminSupabase.auth.admin.deleteUser(authData.user.id).catch(() => {
        // Silently ignore cleanup errors
      });
      return NextResponse.json(
        { message: profileError.message },
        { status: 400 },
      );
    }

    return NextResponse.json(profile, { status: 201 });
  } catch (error) {
    console.error('Profile creation error:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 },
    );
  }
}
