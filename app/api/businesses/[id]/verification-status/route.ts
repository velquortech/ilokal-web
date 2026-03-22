import { createServerSupabaseClient } from '@/config/server';
import { NextRequest, NextResponse } from 'next/server';
import type { ApiResponse } from '@/lib/types';

interface VerificationStatusData {
  id: string;
  status: 'pending' | 'verified' | 'suspended' | 'rejected';
  name: string;
  created_at: string | null;
}

/**
 * GET /api/businesses/:id/verification-status
 * Public endpoint to check business verification status
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const supabase = await createServerSupabaseClient();
    const { id: businessId } = await params;

    // Validate UUID format
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(businessId)) {
      return NextResponse.json<ApiResponse<null>>(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid business ID format',
          },
        },
        { status: 400 },
      );
    }

    const { data, error } = await supabase
      .from('businesses')
      .select('id, status, name, created_at')
      .eq('id', businessId)
      .is('archived_at', null)
      .single();

    if (error) {
      return NextResponse.json<ApiResponse<null>>(
        {
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Business not found',
          },
        },
        { status: 404 },
      );
    }

    const verificationData: VerificationStatusData = {
      id: data.id,
      status: data.status,
      name: data.name,
      created_at: data.created_at,
    };

    return NextResponse.json<ApiResponse<VerificationStatusData>>(
      {
        success: true,
        data: verificationData,
      },
      { status: 200, headers: { 'Cache-Control': 'public, max-age=60' } },
    );
  } catch (error) {
    return NextResponse.json<ApiResponse<null>>(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message:
            error instanceof Error
              ? error.message
              : 'Failed to fetch verification status',
        },
      },
      { status: 500 },
    );
  }
}
