/**
 * POST /api/subscriptions/subscribe
 * GET /api/subscriptions/me
 * PUT /api/subscriptions/me
 * DELETE /api/subscriptions/me
 * POST /api/subscriptions/upgrade
 * POST /api/subscriptions/downgrade
 *
 * User subscription management endpoints
 * Requires authentication
 */

import { NextResponse, type NextRequest } from 'next/server';
import type {
  ApiResponse,
  SubscriptionResponse,
  CancelSubscriptionRequest,
} from '@/lib/types';
import { assertAuthorized } from '@/lib/utils/assertAuthorized';
import { verifyBusinessOwner } from '@/lib/api/verifyBusinessOwner';
import {
  createSubscriptionSchema,
  updateSubscriptionSchema,
  cancelSubscriptionSchema,
} from '@/lib/validation/subscriptions';
import * as subscriptionQuery from '@/lib/api/subscriptions/subscriptionQuery';
import * as subscriptionService from '@/lib/api/subscriptions/subscriptionService';

/**
 * POST /api/subscriptions/subscribe
 * Create new subscription for business
 */
export async function POST(request: NextRequest) {
  try {
    const auth = await verifyBusinessOwner();
    if (!auth.authorized) {
      return NextResponse.json(
        {
          success: false,
          error: auth.error || {
            code: 'AUTHENTICATION_ERROR',
            message: 'Not authenticated',
          },
        } as ApiResponse<null>,
        { status: auth.error?.code === 'AUTHENTICATION_ERROR' ? 401 : 403 },
      );
    }

    const body = await request.json();
    const validated = createSubscriptionSchema.safeParse(body);

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

    // Get user's primary business
    const businessResult = { data: { id: auth.business!.id } };
    if ('error' in businessResult) {
      return NextResponse.json(
        {
          success: false,
          error: { code: 'NOT_FOUND', message: 'No business found for user' },
        } as ApiResponse<null>,
        { status: 404 },
      );
    }

    const result = await subscriptionService.createSubscription(
      businessResult.data.id,
      validated.data,
    );

    return NextResponse.json(result, {
      status: result.success
        ? 201
        : result.error?.code === 'NOT_FOUND'
          ? 404
          : 400,
    });
  } catch (error) {
    console.error('[POST /api/subscriptions/subscribe]', error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to create subscription',
        },
      } as ApiResponse<null>,
      { status: 500 },
    );
  }
}

/**
 * GET /api/subscriptions/me
 * Get current active subscription for authenticated business
 */
export async function GET(_request: NextRequest) {
  try {
    const auth = await assertAuthorized(_request);
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
    const result = await subscriptionQuery.getActiveSubscription(businessId);

    if ('error' in result) {
      // No active subscription is valid state (free tier)
      return NextResponse.json(
        {
          success: true,
          data: null,
        },
        {
          status: 200,
          headers: {
            'Cache-Control': 'private, max-age=300',
          },
        },
      );
    }

    // Get plan details - check plan_id is not null (from database schema)
    if (!result.data.plan_id) {
      return NextResponse.json(
        {
          success: false,
          error: { code: 'NOT_FOUND', message: 'Associated plan not found' },
        } as ApiResponse<null>,
        { status: 404 },
      );
    }

    const planResult = await subscriptionQuery.getSubscriptionPlanById(
      result.data.plan_id,
    );

    if ('error' in planResult) {
      return NextResponse.json(
        {
          success: false,
          error: { code: 'NOT_FOUND', message: 'Associated plan not found' },
        } as ApiResponse<null>,
        { status: 404 },
      );
    }

    const response: SubscriptionResponse = {
      ...result.data,
      plan: planResult.data,
    };

    return NextResponse.json(
      {
        success: true,
        data: response,
      } as ApiResponse<SubscriptionResponse>,
      {
        status: 200,
        headers: {
          'Cache-Control': 'private, max-age=300',
        },
      },
    );
  } catch (error) {
    console.error('[GET /api/subscriptions/me]', error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to fetch subscription',
        },
      } as ApiResponse<null>,
      { status: 500 },
    );
  }
}

/**
 * PUT /api/subscriptions/me
 * Update current subscription (billing cycle, payment method, auto-renew)
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

    // Get current subscription
    const currentResult =
      await subscriptionQuery.getActiveSubscription(businessId);
    if ('error' in currentResult) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'No active subscription',
          },
        } as ApiResponse<null>,
        { status: 404 },
      );
    }

    const body = await request.json();
    const validated = updateSubscriptionSchema.safeParse(body);

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

    const result = await subscriptionService.updateSubscription(
      currentResult.data.id,
      validated.data,
    );

    return NextResponse.json(result, {
      status: result.success
        ? 200
        : result.error?.code === 'NOT_FOUND'
          ? 404
          : 400,
    });
  } catch (error) {
    console.error('[PUT /api/subscriptions/me]', error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to update subscription',
        },
      } as ApiResponse<null>,
      { status: 500 },
    );
  }
}

/**
 * DELETE /api/subscriptions/me
 * Cancel current subscription
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

    // Get current subscription
    const currentResult =
      await subscriptionQuery.getActiveSubscription(businessId);
    if ('error' in currentResult) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'No active subscription',
          },
        } as ApiResponse<null>,
        { status: 404 },
      );
    }

    const body = await request.json().catch(() => ({}));
    const validated = cancelSubscriptionSchema.safeParse(body);

    const cancelInput: CancelSubscriptionRequest = validated.success
      ? validated.data
      : { cancel_at: 'period_end' };

    const result = await subscriptionService.cancelSubscription(
      currentResult.data.id,
      cancelInput,
    );

    return NextResponse.json(result, {
      status: result.success ? 200 : 400,
    });
  } catch (error) {
    console.error('[DELETE /api/subscriptions/me]', error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to cancel subscription',
        },
      } as ApiResponse<null>,
      { status: 500 },
    );
  }
}
