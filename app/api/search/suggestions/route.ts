export const dynamic = 'force-dynamic';

/**
 * GET /api/search/suggestions - Autocomplete suggestions
 * Public endpoint
 */

import { NextResponse, type NextRequest } from 'next/server';
import type { ApiResponse } from '@/lib/types';
import * as searchService from '@/lib/api/search/searchService';

// Cache for short period
export const revalidate = 60;

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get('q') || searchParams.get('query') || '';
    const limit = Math.min(
      Math.max(1, parseInt(searchParams.get('limit') || '10', 10)),
      50,
    );

    if (!query || !query.trim()) {
      return NextResponse.json(
        { success: true, data: { suggestions: [] } } as ApiResponse<{
          suggestions: string[];
        }>,
        { status: 200 },
      );
    }

    const result = await searchService.getSuggestions(query.trim(), limit);

    return NextResponse.json(result, {
      status: result.success ? 200 : 500,
      headers: { 'Cache-Control': 'public, max-age=60' },
    });
  } catch (error) {
    console.error('[GET /api/search/suggestions]', error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to fetch suggestions',
        },
      } as ApiResponse<null>,
      { status: 500 },
    );
  }
}
