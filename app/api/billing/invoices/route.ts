/**
 * GET /api/billing/invoices
 * GET /api/billing/invoices/:id
 *
 * User invoices management
 * Requires authentication
 */

import { NextResponse, type NextRequest } from 'next/server';
import type {
  ApiResponse,
  BillingInvoiceResponse,
  PaginatedInvoiceResponse,
  Subscription,
} from '@/lib/types';
import { getCurrentUser } from '@/lib/api/getAdminUser';
import { invoiceFiltersSchema } from '@/lib/validation/subscriptions';
import * as subscriptionQuery from '@/lib/api/subscriptions/subscriptionQuery';

/**
 * GET /api/billing/invoices
 * List invoices for authenticated business
 */
export async function GET(request: NextRequest) {
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

    const pathname = request.nextUrl.pathname;
    const idMatch = pathname.match(/\/api\/billing\/invoices\/([^/]+)$/);

    // Handle GET /api/billing/invoices/:id
    if (idMatch) {
      const invoiceId = idMatch[1];

      const result = await subscriptionQuery.getInvoiceById(invoiceId);

      if ('error' in result) {
        return NextResponse.json(
          {
            success: false,
            error: { code: 'NOT_FOUND', message: result.error },
          } as ApiResponse<null>,
          { status: 404 },
        );
      }

      // TODO: Verify ownership - invoice.business_id === user.business_id

      // Get subscription details
      const subResult = await subscriptionQuery.getSubscriptionById(
        result.data.subscription_id,
      );

      if ('error' in subResult) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: 'NOT_FOUND',
              message: 'Associated subscription not found',
            },
          } as ApiResponse<null>,
          { status: 404 },
        );
      }

      const response: BillingInvoiceResponse = {
        ...result.data,
        subscription: subResult.data,
      };

      return NextResponse.json(
        {
          success: true,
          data: response,
        } as ApiResponse<BillingInvoiceResponse>,
        {
          status: 200,
          headers: {
            'Cache-Control': 'private, max-age=300',
          },
        },
      );
    }

    // Handle GET /api/billing/invoices (list)
    // Get business_id from user's primary business
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

    const queryParams = request.nextUrl.searchParams;
    const filtersObj = {
      page: parseInt(queryParams.get('page') || '1'),
      per_page: parseInt(queryParams.get('per_page') || '10'),
      status: queryParams.get('status') || undefined,
      start_date: queryParams.get('start_date') || undefined,
      end_date: queryParams.get('end_date') || undefined,
      sort_by: queryParams.get('sort_by') || 'newest',
    };

    const filters = invoiceFiltersSchema.safeParse(filtersObj);

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

    const { data: invoices, total } =
      await subscriptionQuery.getBillingInvoices(businessId, filters.data);

    const totalPages = Math.ceil(total / (filters.data.per_page || 10));

    const response: PaginatedInvoiceResponse = {
      data: invoices.map((invoice) => ({
        ...invoice,
        subscription: null as unknown as Subscription,
      })),
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
    console.error('[GET /api/billing/invoices]', error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to fetch invoices',
        },
      } as ApiResponse<null>,
      { status: 500 },
    );
  }
}
