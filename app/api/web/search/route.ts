export const dynamic = 'force-dynamic';
/**
 * GET /api/search - Global search
 * Public endpoint (no authentication required)
 */

import { NextResponse, type NextRequest } from 'next/server';
import type { ApiResponse } from '@/lib/types';
import * as searchService from '@/lib/api/search/searchService';

// Cache search results for 60 seconds
export const revalidate = 60;

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;

    // Get and validate query
    const query = searchParams.get('q') || searchParams.get('query') || '';
    if (!query || !query.trim()) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Search query required (use ?q=term or ?query=term)',
          },
        } as ApiResponse<null>,
        { status: 400 },
      );
    }

    // Parse pagination
    const pagination = {
      page: Math.max(1, parseInt(searchParams.get('page') || '1', 10)),
      per_page: Math.min(
        Math.max(1, parseInt(searchParams.get('per_page') || '20', 10)),
        100,
      ),
    };

    // Parse filters
    const filters = {
      category: searchParams.get('category') || undefined,
      min_rating: searchParams.get('min_rating')
        ? parseFloat(searchParams.get('min_rating')!)
        : undefined,
      max_rating: searchParams.get('max_rating')
        ? parseFloat(searchParams.get('max_rating')!)
        : undefined,
      min_price: searchParams.get('min_price')
        ? parseInt(searchParams.get('min_price')!, 10)
        : undefined,
      max_price: searchParams.get('max_price')
        ? parseInt(searchParams.get('max_price')!, 10)
        : undefined,
      verified_only: searchParams.get('verified_only')
        ? searchParams.get('verified_only') === 'true'
        : undefined,
      is_featured: searchParams.get('is_featured')
        ? searchParams.get('is_featured') === 'true'
        : undefined,
    };

    const sortBy = searchParams.get('sort_by') || 'relevance';

    // Perform global search
    const result = await searchService.globalSearch(
      query.trim(),
      filters,
      pagination,
      sortBy,
    );

    return NextResponse.json(result, {
      status: result.success ? 200 : 400,
      headers: {
        'Cache-Control': 'public, max-age=60',
      },
    });
  } catch (error) {
    console.error('[GET /api/search]', error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to perform search',
        },
      } as ApiResponse<null>,
      { status: 500 },
    );
  }
}
