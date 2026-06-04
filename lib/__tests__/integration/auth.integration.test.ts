import { describe, it, expect, beforeEach, vi, Mock } from 'vitest';
import type { NextRequest } from 'next/server';
import type { TestNextRequest } from '@/lib/types';

import { GET as getCurrentUser } from '@/app/api/web/users/me/route';
import { GET as getAdminProfiles } from '@/app/api/admin/profiles/route';
import { createServerSupabaseClient } from '@/supabase/server';

vi.mock('@/supabase/server', () => ({
  createServerSupabaseClient: vi.fn(),
}));

describe('integration - auth guards', () => {
  beforeEach(() => vi.clearAllMocks());

  it('GET /api/users/me returns 401 when unauthenticated', async () => {
    const supabaseClient = {
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null } }) },
    } as unknown as Awaited<ReturnType<typeof createServerSupabaseClient>>;

    (createServerSupabaseClient as unknown as Mock).mockResolvedValueOnce(
      supabaseClient,
    );

    const res = await getCurrentUser();
    expect(res.status).toBe(401);
  });

  it('GET /api/admin/profiles returns 403 for non-admin role', async () => {
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

    const mockReq: TestNextRequest = {
      url: 'http://localhost/api/admin/profiles',
      nextUrl: new URL('http://localhost/api/admin/profiles'),
    };

    const res = await getAdminProfiles(mockReq as unknown as NextRequest);
    expect(res.status).toBe(403);
  });
});
