/**
 * GET /api/web/analytics/bida — authorization + ownership contract.
 *
 * Claims under test:
 *  - unauthenticated → 401 (assertAuthorized's error passthrough);
 *  - missing business_id → 400;
 *  - a business the caller does not own → 403 (same convention as the
 *    dashboard analytics route);
 *  - owned business → 200 with the service payload;
 *  - service failure → 500.
 */

import { describe, it, expect, vi } from 'vitest';
import type { Mock } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';

vi.mock('@/lib/utils/assertAuthorized', () => ({ assertAuthorized: vi.fn() }));
vi.mock('@/lib/api/getUserBusiness', () => ({ getUserBusiness: vi.fn() }));
vi.mock('@/lib/api/analytics/bidaAnalyticsService', () => ({
  getBidaAnalytics: vi.fn(),
}));

import { GET } from '../route';
import { assertAuthorized } from '@/lib/utils/assertAuthorized';
import * as subscriptionQuery from '@/lib/api/getUserBusiness';
import * as service from '@/lib/api/analytics/bidaAnalyticsService';

const payload = {
  business: { id: 'biz-1', shop_name: 'FixRight Repair Hub', logo_url: null },
  window: { start: '2026-08-06', end: '2026-08-12' },
  summary: {
    total_weekly_views: 3039,
    total_views_delta: 1177,
    best_bida_rank: 1,
    best_bida_rank_delta: 39,
    on_board: true,
  },
  products: [],
};

function request(query: string): NextRequest {
  return new NextRequest(`http://localhost/api/web/analytics/bida?${query}`);
}

function authorized(userId = 'owner-1') {
  (assertAuthorized as Mock).mockResolvedValueOnce({
    authorized: true,
    user: { id: userId },
    profile: { role: 'business_owner' },
  });
}

describe('GET /api/web/analytics/bida', () => {
  it('rejects unauthenticated callers with 401', async () => {
    (assertAuthorized as Mock).mockResolvedValueOnce({
      authorized: false,
      error: NextResponse.json(
        {
          success: false,
          error: {
            code: 'AUTHENTICATION_ERROR',
            message: 'Authentication required',
          },
        },
        { status: 401 },
      ),
    });

    const res = await GET(request('business_id=biz-1'));
    expect(res.status).toBe(401);
  });

  it('rejects a missing business_id with 400', async () => {
    authorized();
    const res = await GET(request(''));
    expect(res.status).toBe(400);
    const body = (await res.json()) as { error: { code: string } };
    expect(body.error.code).toBe('VALIDATION_ERROR');
  });

  it('rejects a business the caller does not own with 403', async () => {
    authorized('owner-1');
    (subscriptionQuery.getUserBusiness as Mock).mockResolvedValueOnce({
      data: { id: 'other-biz' },
    });

    const res = await GET(request('business_id=biz-1'));
    expect(res.status).toBe(403);
    const body = (await res.json()) as { error: { code: string } };
    expect(body.error.code).toBe('AUTHORIZATION_ERROR');
  });

  it('returns 403 when the caller owns no business at all', async () => {
    authorized('owner-1');
    (subscriptionQuery.getUserBusiness as Mock).mockResolvedValueOnce({
      error: 'Business not found for user',
    });

    const res = await GET(request('business_id=biz-1'));
    expect(res.status).toBe(403);
  });

  it('returns 200 with the service payload for an owned business', async () => {
    authorized('owner-1');
    (subscriptionQuery.getUserBusiness as Mock).mockResolvedValueOnce({
      data: { id: 'biz-1' },
    });
    (service.getBidaAnalytics as Mock).mockResolvedValueOnce({
      success: true,
      data: payload,
    });

    const res = await GET(request('business_id=biz-1'));
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      success: boolean;
      data: typeof payload;
    };
    expect(body.success).toBe(true);
    expect(body.data.business.shop_name).toBe('FixRight Repair Hub');
    expect(body.data.summary.best_bida_rank).toBe(1);
  });

  it('surfaces a service failure as 500', async () => {
    authorized('owner-1');
    (subscriptionQuery.getUserBusiness as Mock).mockResolvedValueOnce({
      data: { id: 'biz-1' },
    });
    (service.getBidaAnalytics as Mock).mockResolvedValueOnce({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'boom' },
    });

    const res = await GET(request('business_id=biz-1'));
    expect(res.status).toBe(500);
  });
});
