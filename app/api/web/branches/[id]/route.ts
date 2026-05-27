/**
 * GET /api/branches/:id
 * Fetch a single branch by ID
 */

import { NextRequest, NextResponse } from 'next/server';
import type { ApiResponse, BranchResponse } from '@/lib/types';
import * as branchQuery from '@/lib/api/branches/branchQuery';

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
            message: 'Branch ID is required',
          },
        } as ApiResponse<null>,
        { status: 400 },
      );
    }

    const result = await branchQuery.getBranchById(id);

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
        data: result.branch,
      } as ApiResponse<BranchResponse>,
      {
        headers: {
          'Cache-Control': 'public, max-age=300, must-revalidate',
        },
      },
    );
  } catch (error) {
    console.error('[GET /api/branches/:id]', error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to fetch branch',
        },
      } as ApiResponse<null>,
      { status: 500 },
    );
  }
}
