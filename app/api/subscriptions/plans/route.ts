/**
 * GET /api/subscriptions/plans
 * GET /api/subscriptions/plans/:id
 *
 * Public endpoints for listing subscription plans
 */

import { NextResponse, type NextRequest } from 'next/server';
import type { SubscriptionPlan, ApiResponse } from '@/lib/types';
import * as subscriptionQuery from '@/lib/api/subscriptions/subscriptionQuery';

// Revalidate every 1 hour (plans change rarely)
export const revalidate = 3600;

/**
 * GET /api/subscriptions/plans
 * List all active subscription plans
 */
export async function GET(request: NextRequest) {
  try {
    const pathname = request.nextUrl.pathname;
    const idMatch = pathname.match(/\/api\/subscriptions\/plans\/([^/]+)$/);

    // Handle GET /api/subscriptions/plans/:id
    if (idMatch) {
      const planId = idMatch[1];

      const result = await subscriptionQuery.getSubscriptionPlanById(planId);

      if ('error' in result) {
        return NextResponse.json(
          {
            success: false,
            error: { code: 'NOT_FOUND', message: result.error },
          } as ApiResponse<null>,
          { status: 404 },
        );
      }

      return NextResponse.json(
        {
          success: true,
          data: result.data,
        } as ApiResponse<SubscriptionPlan>,
        {
          status: 200,
          headers: {
            'Cache-Control': 'public, max-age=3600',
          },
        },
      );
    }

    // Handle GET /api/subscriptions/plans (list all)
    const plans = await subscriptionQuery.getSubscriptionPlans();

    return NextResponse.json(
      {
        success: true,
        data: {
          plans,
          count: plans.length,
        },
      },
      {
        status: 200,
        headers: {
          'Cache-Control': 'public, max-age=3600',
        },
      },
    );
  } catch (error) {
    console.error('[GET /api/subscriptions/plans]', error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to fetch subscription plans',
        },
      } as ApiResponse<null>,
      { status: 500 },
    );
  }
}
