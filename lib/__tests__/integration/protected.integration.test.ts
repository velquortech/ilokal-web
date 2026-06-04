import { describe, it, expect, beforeEach, vi, Mock } from 'vitest';
import type { NextRequest } from 'next/server';

import { GET as getRevenue } from '@/app/api/admin/analytics/revenue/route';
import { POST as postUpgrade } from '@/app/api/web/subscriptions/upgrade/route';
import { PUT as putNotification } from '@/app/api/web/notifications/[id]/route';
import { createServerSupabaseClient } from '@/supabase/server';

vi.mock('@/supabase/server', () => ({
  createServerSupabaseClient: vi.fn(),
}));

vi.mock('@/lib/api/subscriptions/subscriptionQuery', () => ({
  getUserBusiness: vi.fn(),
}));

describe('integration - protected routes (representative)', () => {
  beforeEach(() => vi.clearAllMocks());

  it('GET /api/admin/analytics/revenue returns 401 when unauthenticated', async () => {
    const supabaseClient = {
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null } }) },
    } as unknown as Awaited<ReturnType<typeof createServerSupabaseClient>>;

    (createServerSupabaseClient as unknown as Mock).mockResolvedValueOnce(
      supabaseClient,
    );

    const res = await getRevenue({} as unknown as NextRequest);
    expect(res.status).toBe(401);
  });

  it('GET /api/admin/analytics/revenue returns 403 for non-admin role', async () => {
    const supabaseClient = {
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'u1' } } }),
      },
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn(async () => ({
              data: {
                id: 'u1',
                role: 'business_owner',
                status: 'active',
                email: 'x',
              },
              error: null,
            })),
          })),
        })),
      })),
    } as unknown as Awaited<ReturnType<typeof createServerSupabaseClient>>;

    (createServerSupabaseClient as unknown as Mock).mockResolvedValueOnce(
      supabaseClient,
    );

    const mockReq: Partial<NextRequest> = {
      url: 'http://localhost/api/admin/analytics/revenue',
    };

    const res = await getRevenue(mockReq as NextRequest);
    expect(res.status).toBe(403);
  });

  it('POST /api/subscriptions/upgrade returns 401 when unauthenticated', async () => {
    const supabaseClient = {
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null } }) },
    } as unknown as Awaited<ReturnType<typeof createServerSupabaseClient>>;

    (createServerSupabaseClient as unknown as Mock).mockResolvedValueOnce(
      supabaseClient,
    );

    const res = await postUpgrade({} as unknown as NextRequest);
    expect(res.status).toBe(401);
  });

  it('PUT /api/notifications/:id returns 401 when unauthenticated', async () => {
    const supabaseClient = {
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null } }) },
    } as unknown as Awaited<ReturnType<typeof createServerSupabaseClient>>;

    (createServerSupabaseClient as unknown as Mock).mockResolvedValueOnce(
      supabaseClient,
    );

    const paramsCtx = { params: { id: 'n1' } } as unknown as {
      params: { id: string };
    };
    const res = await putNotification({} as unknown as NextRequest, paramsCtx);
    expect(res.status).toBe(401);
  });
});
