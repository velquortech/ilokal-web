/**
 * GET /api/products
 * List products with pagination and filtering
 */

import { NextRequest, NextResponse } from 'next/server';
import type { ApiResponse, PaginatedProductsResponse } from '@/lib/types';
import { productFiltersSchema } from '@/lib/validation/products';
import * as productQuery from '@/lib/api/products/productQuery';

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;

    // Parse and validate query parameters
    const params = {
      page: searchParams.get('page') ? parseInt(searchParams.get('page')!) : 1,
      per_page: searchParams.get('per_page')
        ? parseInt(searchParams.get('per_page')!)
        : 10,
      search: searchParams.get('search') || undefined,
      category_id: searchParams.get('category_id') || undefined,
      status: searchParams.get('status') || 'active',
      business_id: searchParams.get('business_id') || undefined,
      sort_by: (searchParams.get('sort_by') || 'newest') as
        | 'newest'
        | 'oldest'
        | 'name_asc'
        | 'name_desc'
        | 'price_low'
        | 'price_high',
      min_price: searchParams.get('min_price')
        ? parseFloat(searchParams.get('min_price')!)
        : undefined,
      max_price: searchParams.get('max_price')
        ? parseFloat(searchParams.get('max_price')!)
        : undefined,
    };

    const validation = productFiltersSchema.safeParse(params);
    if (!validation.success) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid query parameters',
            details: validation.error.flatten(),
          },
        } as ApiResponse<null>,
        { status: 400 },
      );
    }

    const result = await productQuery.getProductsPaginated(validation.data);

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
      } as ApiResponse<PaginatedProductsResponse>,
      {
        headers: {
          'Cache-Control': 'public, max-age=60, must-revalidate',
        },
      },
    );
  } catch (error) {
    console.error('[GET /api/products]', error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to fetch products',
        },
      } as ApiResponse<null>,
      { status: 500 },
    );
  }
}
