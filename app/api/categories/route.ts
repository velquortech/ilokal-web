/**
 * GET /api/categories
 * List all product categories with pagination
 */

import { NextRequest, NextResponse } from 'next/server';
import type { ApiResponse } from '@/lib/types';
import { categoryFiltersSchema } from '@/lib/validation/products';
import * as productQuery from '@/lib/api/products/productQuery';

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;

    const params = {
      page: searchParams.get('page') ? parseInt(searchParams.get('page')!) : 1,
      per_page: searchParams.get('per_page')
        ? parseInt(searchParams.get('per_page')!)
        : 20,
      search: searchParams.get('search') || undefined,
      sort_by: (searchParams.get('sort_by') || 'name_asc') as
        | 'name_asc'
        | 'name_desc'
        | 'newest'
        | 'oldest',
    };

    const validation = categoryFiltersSchema.safeParse(params);
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

    const result = await productQuery.getCategoriesPaginated(validation.data);

    return NextResponse.json(
      {
        success: true,
        data: result,
      } as ApiResponse<typeof result>,
      {
        headers: {
          'Cache-Control': 'public, max-age=3600, must-revalidate',
        },
      },
    );
  } catch (error) {
    console.error('[GET /api/categories]', error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to fetch categories',
        },
      } as ApiResponse<null>,
      { status: 500 },
    );
  }
}
