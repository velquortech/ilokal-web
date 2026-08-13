'use server';

/**
 * Bida of the Day editorial actions (admin only — the API routes they call are
 * `assertAuthorized`-guarded with the admin role).
 */

import type { ApiResponse } from '@/lib/types';
import type {
  BidaPick,
  BidaProductResult,
} from '@/lib/api/admin/bidaOfTheDayQuery';
import { logActionError } from '@/lib/utils/captureError';

async function callBidaApi<T>(
  path: string,
  method: 'GET' | 'POST' | 'DELETE',
  body?: Record<string, unknown>,
): Promise<ApiResponse<T>> {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || '';
    const url = new URL(`/api/admin/bida-of-the-day${path}`, baseUrl);

    const response = await fetch(url.toString(), {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined,
    });

    return (await response.json()) as ApiResponse<T>;
  } catch (error) {
    logActionError('callBidaApi', error);
    return {
      success: false,
      error: {
        code: 'ACTION_ERROR',
        message: 'Something went wrong. Please try again.',
      },
    };
  }
}

/** List scheduled picks, newest date first. */
export async function listBidaPicksAction(): Promise<
  ApiResponse<{ picks: BidaPick[] }>
> {
  return callBidaApi<{ picks: BidaPick[] }>('', 'GET');
}

/** Set (or replace) the pick for a date. */
export async function upsertBidaPickAction(input: {
  pick_date: string;
  product_id: string;
  note?: string | null;
}): Promise<ApiResponse<{ pick: BidaPick }>> {
  return callBidaApi<{ pick: BidaPick }>('', 'POST', {
    pick_date: input.pick_date,
    product_id: input.product_id,
    note: input.note ?? null,
  });
}

/** Unset the pick for a date. */
export async function deleteBidaPickAction(
  pick_date: string,
): Promise<ApiResponse<null>> {
  return callBidaApi<null>('', 'DELETE', { pick_date });
}

/** Product picker search — product name OR business name. */
export async function searchBidaProductsAction(
  q: string,
): Promise<ApiResponse<{ products: BidaProductResult[] }>> {
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || '';
  const url = new URL('/api/admin/bida-of-the-day/search', baseUrl);
  url.searchParams.set('q', q);
  try {
    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });
    return (await response.json()) as ApiResponse<{
      products: BidaProductResult[];
    }>;
  } catch (error) {
    logActionError('searchBidaProductsAction', error);
    return {
      success: false,
      error: {
        code: 'ACTION_ERROR',
        message: 'Product search failed. Please try again.',
      },
    };
  }
}
