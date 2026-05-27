/**
 * GET /api/products/:id
 * Fetch a single product by ID
 */

import { NextRequest, NextResponse } from 'next/server';
import type { ApiResponse, ProductResponse } from '@/lib/types';
import * as productQuery from '@/lib/api/products/productQuery';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Product ID is required',
          },
        } as ApiResponse<null>,
        { status: 400 },
      );
    }

    const result = await productQuery.getProductById(id);

    if ('error' in result) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: result.error,
          },
        } as ApiResponse<null>,
        { status: 404 },
      );
    }

    return NextResponse.json(
      {
        success: true,
        data: result.product,
      } as ApiResponse<ProductResponse>,
      {
        headers: {
          'Cache-Control': 'public, max-age=300, must-revalidate',
        },
      },
    );
  } catch (error) {
    console.error('[GET /api/products/:id]', error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to fetch product',
        },
      } as ApiResponse<null>,
      { status: 500 },
    );
  }
}
