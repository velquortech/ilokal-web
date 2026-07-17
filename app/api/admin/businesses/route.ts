/**
 * Business Admin API Routes
 *
 * GET /api/admin/businesses - List all businesses with filters
 * POST /api/admin/businesses - Create business (future)
 */

import { NextRequest, NextResponse } from 'next/server';
import { assertAuthorized } from '@/lib/utils/assertAuthorized';
import { businessFiltersSchema } from '@/lib/validation/business';
import {
  getBusinessesPaginated,
  countBusinessesByStatus,
} from '@/lib/api/business/businessQuery';

/**
 * GET /api/admin/businesses
 * Fetch paginated list of businesses with filters
 */
export async function GET(request: NextRequest) {
  try {
    // Enforce admin authorization
    const auth = await assertAuthorized(request, { roles: ['admin'] });
    if (!auth.authorized) return auth.error;

    // Parse and validate filters from query params
    const queryParams = Object.fromEntries(request.nextUrl.searchParams);
    const filters = businessFiltersSchema.parse({
      status: queryParams.status || 'all',
      search: queryParams.search,
      sortBy: queryParams.sortBy || 'created',
      sortOrder: queryParams.sortOrder || 'desc',
      page: queryParams.page ? parseInt(queryParams.page as string) : 1,
      pageSize: queryParams.pageSize
        ? parseInt(queryParams.pageSize as string)
        : 10,
    });

    // Fetch paginated businesses
    const { data, total, error } = await getBusinessesPaginated(filters);

    if (error) {
      return NextResponse.json({ error }, { status: 500 });
    }

    // Get status counts
    const { counts } = await countBusinessesByStatus();

    return NextResponse.json(
      {
        success: true,
        data,
        pagination: {
          total,
          page: filters.page,
          pageSize: filters.pageSize,
          totalPages: Math.ceil(total / filters.pageSize),
        },
        counts,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error('[API] GET /api/admin/businesses:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch businesses',
      },
      { status: 500 },
    );
  }
}
