/**
 * GET /api/billing/usage
 *
 * Get feature usage and limits for current subscription
 * Requires authentication
 */

import { NextResponse, type NextRequest } from 'next/server';
import type { ApiResponse, BillingUsageResponse } from '@/lib/types';
import { getCurrentUser } from '@/lib/api/getAdminUser';
import * as subscriptionQuery from '@/lib/api/subscriptions/subscriptionQuery';

export async function GET(_request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        {
          success: false,
          error: { code: 'AUTHENTICATION_ERROR', message: 'Not authenticated' },
        } as ApiResponse<null>,
        { status: 401 },
      );
    }

    // Get user's primary business
    const businessResult = await subscriptionQuery.getUserBusiness(user.id);
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

    // Get active subscription
    const subResult = await subscriptionQuery.getActiveSubscription(businessId);

    if ('error' in subResult) {
      // No active subscription - return free tier limits
      return NextResponse.json(
        {
          success: true,
          data: {
            subscription: null,
            usage: {
              subscription_id: '',
              business_id: businessId,
              period_start: new Date().toISOString(),
              period_end: new Date(
                Date.now() + 30 * 24 * 60 * 60 * 1000,
              ).toISOString(),
              products_count: 0,
              branches_count: 0,
              team_members_count: 0,
              api_calls_this_month: 0,
              storage_used_gb: 0,
            },
            limits: {
              max_products: 5, // Free tier limits
              max_branches: 1,
              max_users: 1,
              max_api_calls_per_month: 1000,
              max_storage_gb: 1,
            },
            usage_percentage: {
              products: 0,
              branches: 0,
              users: 0,
              api_calls: 0,
              storage: 0,
            },
          } as BillingUsageResponse,
        },
        {
          status: 200,
          headers: {
            'Cache-Control': 'private, max-age=300',
          },
        },
      );
    }

    // Get plan details
    const planResult = await subscriptionQuery.getSubscriptionPlanById(
      subResult.data.plan_id,
    );

    if ('error' in planResult) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Subscription plan not found',
          },
        } as ApiResponse<null>,
        { status: 404 },
      );
    }

    // Get usage metrics
    const usageResult = await subscriptionQuery.getSubscriptionUsage(
      subResult.data.id,
    );

    if ('error' in usageResult) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'INTERNAL_ERROR',
            message: 'Failed to calculate usage',
          },
        } as ApiResponse<null>,
        { status: 500 },
      );
    }

    const usage = usageResult.data;
    const plan = planResult.data;

    // Calculate usage percentages
    const usagePercentage = {
      products: plan.max_products
        ? Math.round((usage.products_count / plan.max_products) * 100)
        : 0,
      branches: plan.max_branches
        ? Math.round((usage.branches_count / plan.max_branches) * 100)
        : 0,
      users: plan.max_users
        ? Math.round((usage.team_members_count / plan.max_users) * 100)
        : 0,
      api_calls: plan.max_api_calls_per_month
        ? Math.round(
            (usage.api_calls_this_month / plan.max_api_calls_per_month) * 100,
          )
        : 0,
      storage: plan.max_storage_gb
        ? Math.round((usage.storage_used_gb / plan.max_storage_gb) * 100)
        : 0,
    };

    const response: BillingUsageResponse = {
      subscription: subResult.data,
      usage,
      limits: {
        max_products: plan.max_products,
        max_branches: plan.max_branches,
        max_users: plan.max_users,
        max_api_calls_per_month: plan.max_api_calls_per_month,
        max_storage_gb: plan.max_storage_gb,
      },
      usage_percentage: usagePercentage,
    };

    return NextResponse.json(
      {
        success: true,
        data: response,
      } as ApiResponse<BillingUsageResponse>,
      {
        status: 200,
        headers: {
          'Cache-Control': 'private, max-age=300',
        },
      },
    );
  } catch (error) {
    console.error('[GET /api/billing/usage]', error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to fetch usage',
        },
      } as ApiResponse<null>,
      { status: 500 },
    );
  }
}
