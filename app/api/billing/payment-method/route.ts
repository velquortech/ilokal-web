/**
 * POST /api/billing/payment-method
 * GET /api/billing/payment-method
 * PUT /api/billing/payment-method/:id
 * DELETE /api/billing/payment-method/:id
 *
 * Payment methods management for billing
 * Requires authentication
 */

import { NextResponse, type NextRequest } from 'next/server';
import { assertAuthorized } from '@/lib/utils/assertAuthorized';
import type {
  ApiResponse,
  SubscriptionPaymentMethod,
  PaginatedPaymentMethodResponse,
} from '@/lib/types';
// import { getCurrentUser } from '@/lib/api/getAdminUser';
import {
  createPaymentMethodSchema,
  updatePaymentMethodSchema,
  paymentMethodFiltersSchema,
} from '@/lib/validation/subscriptions';
import * as subscriptionQuery from '@/lib/api/subscriptions/subscriptionQuery';
import * as subscriptionService from '@/lib/api/subscriptions/subscriptionService';

/**
 * POST /api/billing/payment-method
 * Add new payment method for business
 */
export async function POST(request: NextRequest) {
  try {
    const auth = await assertAuthorized(request);
    if (!auth.authorized) return auth.error;

    // Get user's primary business
    const businessResult = await subscriptionQuery.getUserBusiness(
      auth.user.id,
    );
    if ('error' in businessResult) {
      return NextResponse.json(
        {
          success: false,
          error: { code: 'NOT_FOUND', message: 'No business found for user' },
        } as ApiResponse<null>,
        { status: 404 },
      );
    }

    const businessId = businessResult.data.id;

    const body = await request.json();
    const validated = createPaymentMethodSchema.safeParse(body);

    if (!validated.success) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid request data',
            details: validated.error.issues,
          },
        } as ApiResponse<null>,
        { status: 400 },
      );
    }

    const result = await subscriptionService.addPaymentMethod(
      businessId,
      validated.data,
    );

    return NextResponse.json(result, {
      status: result.success ? 201 : 400,
    });
  } catch (error) {
    console.error('[POST /api/billing/payment-method]', error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to add payment method',
        },
      } as ApiResponse<null>,
      { status: 500 },
    );
  }
}

/**
 * GET /api/billing/payment-method
 * List payment methods for authenticated business
 */
export async function GET(request: NextRequest) {
  try {
    const auth = await assertAuthorized(request);
    if (!auth.authorized) return auth.error;
    const pathname = request.nextUrl.pathname;
    const idMatch = pathname.match(/\/api\/billing\/payment-method\/([^/]+)$/);

    // Handle GET /api/billing/payment-method/:id
    if (idMatch) {
      const paymentMethodId = idMatch[1];

      const result =
        await subscriptionQuery.getPaymentMethodById(paymentMethodId);

      if ('error' in result) {
        return NextResponse.json(
          {
            success: false,
            error: { code: 'NOT_FOUND', message: result.error },
          } as ApiResponse<null>,
          { status: 404 },
        );
      }

      // TODO: Verify ownership

      return NextResponse.json(
        {
          success: true,
          data: result.data as unknown as SubscriptionPaymentMethod,
        } as ApiResponse<SubscriptionPaymentMethod>,
        {
          status: 200,
          headers: {
            'Cache-Control': 'private, max-age=300',
          },
        },
      );
    }

    // Handle GET /api/billing/payment-method (list)
    // Get user's primary business
    const businessResult = await subscriptionQuery.getUserBusiness(
      auth.user.id,
    );
    if ('error' in businessResult) {
      return NextResponse.json(
        {
          success: false,
          error: { code: 'NOT_FOUND', message: 'No business found for user' },
        } as ApiResponse<null>,
        { status: 404 },
      );
    }

    const businessId = businessResult.data.id;

    const queryParams = request.nextUrl.searchParams;
    const filtersObj = {
      page: parseInt(queryParams.get('page') || '1'),
      per_page: parseInt(queryParams.get('per_page') || '20'),
      type: queryParams.get('type') || undefined,
    };

    const filters = paymentMethodFiltersSchema.safeParse(filtersObj);

    if (!filters.success) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid filters',
          },
        } as ApiResponse<null>,
        { status: 400 },
      );
    }

    const { data: paymentMethods, total } =
      await subscriptionQuery.getPaymentMethods(businessId, filters.data);

    const totalPages = Math.ceil(total / (filters.data.per_page || 20));

    const response: PaginatedPaymentMethodResponse = {
      data: paymentMethods,
      pagination: {
        page: filters.data.page,
        per_page: filters.data.per_page,
        total,
        total_pages: totalPages,
      },
    };

    return NextResponse.json(
      {
        success: true,
        data: response,
      },
      {
        status: 200,
        headers: {
          'Cache-Control': 'private, max-age=300',
        },
      },
    );
  } catch (error) {
    console.error('[GET /api/billing/payment-method]', error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to fetch payment methods',
        },
      } as ApiResponse<null>,
      { status: 500 },
    );
  }
}

/**
 * PUT /api/billing/payment-method/:id
 * Update payment method (set as default, update expiry)
 */
export async function PUT(request: NextRequest) {
  try {
    const auth = await assertAuthorized(request);
    if (!auth.authorized) return auth.error;

    // Get user's primary business
    const businessResult = await subscriptionQuery.getUserBusiness(
      auth.user.id,
    );
    if ('error' in businessResult) {
      return NextResponse.json(
        {
          success: false,
          error: { code: 'NOT_FOUND', message: 'No business found for user' },
        } as ApiResponse<null>,
        { status: 404 },
      );
    }

    const businessId = businessResult.data.id;

    const pathname = request.nextUrl.pathname;
    const idMatch = pathname.match(/\/api\/billing\/payment-method\/([^/]+)$/);

    if (!idMatch) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Payment method ID required',
          },
        } as ApiResponse<null>,
        { status: 400 },
      );
    }

    const paymentMethodId = idMatch[1];
    const body = await request.json();
    const validated = updatePaymentMethodSchema.safeParse(body);

    if (!validated.success) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid request data',
            details: validated.error.issues,
          },
        } as ApiResponse<null>,
        { status: 400 },
      );
    }

    // If setting as default
    if (validated.data.is_default) {
      const result = await subscriptionService.setDefaultPaymentMethod(
        businessId,
        paymentMethodId,
      );

      return NextResponse.json(result, {
        status: result.success ? 200 : 404,
      });
    }

    // TODO: Handle other updates (expiry dates in Stripe integration)

    return NextResponse.json(
      {
        success: true,
        data: { message: 'Payment method updated' },
      },
      { status: 200 },
    );
  } catch (error) {
    console.error('[PUT /api/billing/payment-method/:id]', error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to update payment method',
        },
      } as ApiResponse<null>,
      { status: 500 },
    );
  }
}

/**
 * DELETE /api/billing/payment-method/:id
 * Remove payment method
 */
export async function DELETE(request: NextRequest) {
  try {
    const auth = await assertAuthorized(request);
    if (!auth.authorized) return auth.error;

    // Get user's primary business
    const businessResult = await subscriptionQuery.getUserBusiness(
      auth.user.id,
    );
    if ('error' in businessResult) {
      return NextResponse.json(
        {
          success: false,
          error: { code: 'NOT_FOUND', message: 'No business found for user' },
        } as ApiResponse<null>,
        { status: 404 },
      );
    }

    const businessId = businessResult.data.id;

    const pathname = request.nextUrl.pathname;
    const idMatch = pathname.match(/\/api\/billing\/payment-method\/([^/]+)$/);

    if (!idMatch) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Payment method ID required',
          },
        } as ApiResponse<null>,
        { status: 400 },
      );
    }

    const paymentMethodId = idMatch[1];

    // Verify ownership
    const pmResult =
      await subscriptionQuery.getPaymentMethodById(paymentMethodId);
    if ('error' in pmResult || pmResult.data.business_id !== businessId) {
      return NextResponse.json(
        {
          success: false,
          error: { code: 'NOT_FOUND', message: 'Payment method not found' },
        } as ApiResponse<null>,
        { status: 404 },
      );
    }

    const result =
      await subscriptionService.removePaymentMethod(paymentMethodId);

    return NextResponse.json(result, {
      status: result.success ? 200 : 500,
    });
  } catch (error) {
    console.error('[DELETE /api/billing/payment-method/:id]', error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to remove payment method',
        },
      } as ApiResponse<null>,
      { status: 500 },
    );
  }
}
