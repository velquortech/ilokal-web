/**
 * POST /api/subscriptions/upgrade
 * Upgrade subscription to higher tier
 */

import { NextResponse, type NextRequest } from 'next/server';
import { assertAuthorized } from '@/lib/utils/assertAuthorized';
import type { ApiResponse } from '@/lib/types';
import { getCurrentUser } from '@/lib/api/getCurrentUser';
import { upgradeSubscriptionSchema } from '@/lib/validation/subscriptions';
import * as subscriptionQuery from '@/lib/api/subscriptions/subscriptionQuery';
import * as subscriptionService from '@/lib/api/subscriptions/subscriptionService';

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
    const validated = upgradeSubscriptionSchema.safeParse(body);

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

    const result = await subscriptionService.upgradeSubscription(
      currentResult.data.id,
      validated.data,
    );

    return NextResponse.json(result, {
      status: result.success ? 200 : 400,
    });
  } catch (error) {
    console.error('[POST /api/subscriptions/upgrade]', error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to upgrade subscription',
        },
      } as ApiResponse<null>,
      { status: 500 },
    );
  }
}
