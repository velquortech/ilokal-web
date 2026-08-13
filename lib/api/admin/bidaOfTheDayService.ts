import type { ApiResponse } from '@/lib/types';
import * as bidaQuery from './bidaOfTheDayQuery';

export async function getBidaPicks(): Promise<
  ApiResponse<{ picks: bidaQuery.BidaPick[] }>
> {
  try {
    const picks = await bidaQuery.listBidaPicks();
    return { success: true, data: { picks } };
  } catch (error) {
    console.error('[getBidaPicks]', error);
    return {
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to load Bida picks' },
    };
  }
}

export async function createBidaPick(
  input: bidaQuery.BidaPickInput,
): Promise<ApiResponse<{ pick: bidaQuery.BidaPick }>> {
  try {
    const pick = await bidaQuery.upsertBidaPick(input);
    return { success: true, data: { pick } };
  } catch (error) {
    console.error('[createBidaPick]', error);
    return {
      success: false,
      error: {
        code: 'INVALID_PICK',
        message:
          error instanceof Error ? error.message : 'Failed to save the pick',
      },
    };
  }
}

export async function removeBidaPick(
  pick_date: string,
): Promise<ApiResponse<null>> {
  try {
    await bidaQuery.deleteBidaPick(pick_date);
    return { success: true, data: null };
  } catch (error) {
    console.error('[removeBidaPick]', error);
    return {
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to remove the pick',
      },
    };
  }
}

export async function findBidaProducts(
  q: string,
): Promise<ApiResponse<{ products: bidaQuery.BidaProductResult[] }>> {
  try {
    const products = await bidaQuery.searchBidaProducts(q);
    return { success: true, data: { products } };
  } catch (error) {
    console.error('[findBidaProducts]', error);
    return {
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Product search failed' },
    };
  }
}
