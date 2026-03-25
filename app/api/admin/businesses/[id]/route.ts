/**
 * Business Detail API Route
 *
 * GET /api/admin/businesses/[id] - Get business details
 * PUT /api/admin/businesses/[id] - Update business
 * DELETE /api/admin/businesses/[id] - Archive business
 */

import { NextRequest, NextResponse } from 'next/server';
import { assertAuthorized } from '@/lib/utils/assertAuthorized';
import {
  adminUpdateBusinessSchema,
  uuidSchema,
} from '@/lib/validation/business';
import {
  getBusinessById,
  updateBusinessProfile,
  archiveBusinessById,
} from '@/lib/api/business/businessQuery';

// Use centralized assertAuthorized for admin checks

/**
 * GET /api/admin/businesses/[id]
 * Fetch business details with owner information
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const auth = await assertAuthorized(request, { roles: ['admin'] });
    if (!auth.authorized) return auth.error;

    // Validate ID format
    const { id } = await params;
    const { id: businessId } = uuidSchema.parse({ id });

    // Fetch business with owner info
    const { business, error } = await getBusinessById(businessId);

    if (error) {
      return NextResponse.json({ error }, { status: 500 });
    }

    if (!business) {
      return NextResponse.json(
        { error: 'Business not found' },
        { status: 404 },
      );
    }

    return NextResponse.json(
      { success: true, data: business },
      { status: 200 },
    );
  } catch (error) {
    console.error('[API] GET /api/admin/businesses/[id]:', error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : 'Failed to fetch business',
      },
      { status: 500 },
    );
  }
}

/**
 * PUT /api/admin/businesses/[id]
 * Update business profile and/or status
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const auth = await assertAuthorized(request, { roles: ['admin'] });
    if (!auth.authorized) return auth.error;

    // Validate ID format
    const { id } = await params;
    const { id: businessId } = uuidSchema.parse({ id });

    // Parse and validate request body
    const body = await request.json();
    const updates = adminUpdateBusinessSchema.parse(body);

    // Perform update
    const { business, error } = await updateBusinessProfile(
      businessId,
      updates,
    );

    if (error) {
      return NextResponse.json({ error }, { status: 500 });
    }

    if (!business) {
      return NextResponse.json(
        { error: 'Business not found' },
        { status: 404 },
      );
    }

    // Fetch full business with owner info
    const { business: fullBusiness } = await getBusinessById(businessId);

    return NextResponse.json(
      {
        success: true,
        data: fullBusiness,
        message: 'Business updated successfully',
      },
      { status: 200 },
    );
  } catch (error) {
    console.error('[API] PUT /api/admin/businesses/[id]:', error);

    if (error instanceof Error && error.message.includes('validation')) {
      return NextResponse.json(
        { error: `Invalid input: ${error.message}` },
        { status: 400 },
      );
    }

    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : 'Failed to update business',
      },
      { status: 500 },
    );
  }
}

/**
 * DELETE /api/admin/businesses/[id]
 * Archive a business (soft delete, data preserved)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const auth = await assertAuthorized(request, { roles: ['admin'] });
    if (!auth.authorized) return auth.error;

    // Validate ID format
    const { id } = await params;
    const { id: businessId } = uuidSchema.parse({ id });

    // Archive the business
    const { success, error } = await archiveBusinessById(businessId);

    if (error) {
      return NextResponse.json({ error }, { status: 500 });
    }

    return NextResponse.json(
      {
        success,
        message: 'Business archived successfully',
      },
      { status: 200 },
    );
  } catch (error) {
    console.error('[API] DELETE /api/admin/businesses/[id]:', error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : 'Failed to archive business',
      },
      { status: 500 },
    );
  }
}
