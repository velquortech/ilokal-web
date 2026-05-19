/**
 * GET /api/branches
 * List all branches with pagination, filtering, and proximity search
 */

import { NextRequest, NextResponse } from 'next/server';
import type { ApiResponse } from '@/lib/types';
import { branchFiltersSchema } from '@/lib/validation/branches';
import * as branchQuery from '@/lib/api/branches/branchQuery';

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;

    const params = {
      page: searchParams.get('page') ? parseInt(searchParams.get('page')!) : 1,
      per_page: searchParams.get('per_page')
        ? parseInt(searchParams.get('per_page')!)
        : 20,
      search: searchParams.get('search') || undefined,
      latitude: searchParams.get('latitude')
        ? parseFloat(searchParams.get('latitude')!)
        : undefined,
      longitude: searchParams.get('longitude')
        ? parseFloat(searchParams.get('longitude')!)
        : undefined,
      radius_km: searchParams.get('radius_km')
        ? parseFloat(searchParams.get('radius_km')!)
        : undefined,
      sort_by: (searchParams.get('sort_by') || 'name_asc') as
        | 'name_asc'
        | 'name_desc'
        | 'newest'
        | 'oldest',
    };

    const validation = branchFiltersSchema.safeParse(params);
    if (!validation.success) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid query parameters',
          },
        } as ApiResponse<null>,
        { status: 400 },
      );
    }

    const result = await branchQuery.getBranchesPaginated(validation.data);

    if ('error' in result) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'INTERNAL_ERROR',
            message: result.error,
          },
        } as ApiResponse<null>,
        { status: 500 },
      );
    }

    return NextResponse.json(
      {
        success: true,
        data: result,
      } as ApiResponse<typeof result>,
      {
        headers: {
          'Cache-Control': 'public, max-age=60, must-revalidate',
        },
      },
    );
  } catch (error) {
    console.error('[GET /api/branches]', error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to fetch branches',
        },
      } as ApiResponse<null>,
      { status: 500 },
    );
  }
}
