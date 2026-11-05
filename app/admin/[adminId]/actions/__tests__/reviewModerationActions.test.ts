/**
 * Review moderation action. The claims under test: only admins reach the RPC,
 * the RPC runs on the admin's own session client (it re-checks is_admin()),
 * input is validated before any I/O, and a no-op RPC result is reported
 * instead of claimed as success.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getCurrentUser } from '@/lib/api/getCurrentUser';
import { createServerSupabaseClient } from '@/supabase/server';
import { rateLimit } from '@/app/api/helpers/rateLimit';
import { revalidatePath } from 'next/cache';

vi.mock('@/lib/api/getCurrentUser');
vi.mock('@/supabase/server', () => ({ createServerSupabaseClient: vi.fn() }));
vi.mock('@/app/api/helpers/rateLimit', () => ({ rateLimit: vi.fn() }));
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));

import { moderateReviewAction } from '../reviewModerationActions';

const ADMIN_ID = '550e8400-e29b-41d4-a716-4466554400aa';
const RATING_ID = '550e8400-e29b-41d4-a716-446655440001';

const rpc = vi.fn();

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(getCurrentUser).mockResolvedValue({
    id: ADMIN_ID,
    role: 'admin',
  } as never);
  vi.mocked(rateLimit).mockReturnValue({ allowed: true } as never);
  vi.mocked(createServerSupabaseClient).mockResolvedValue({ rpc } as never);
  rpc.mockResolvedValue({ data: true, error: null });
});

describe('moderateReviewAction', () => {
  it('calls the moderation RPC on the session client and revalidates', async () => {
    const res = await moderateReviewAction(RATING_ID, 'hide');

    expect(res).toEqual({ ok: true });
    expect(rpc).toHaveBeenCalledWith('moderate_business_rating', {
      p_rating: RATING_ID,
      p_action: 'hide',
      p_reason: 'admin:hide',
    });
    expect(revalidatePath).toHaveBeenCalledWith(`/admin/${ADMIN_ID}/reviews`);
  });

  it('refuses a non-admin before touching the database', async () => {
    vi.mocked(getCurrentUser).mockResolvedValue({
      id: ADMIN_ID,
      role: 'app_user',
    } as never);
    const res = await moderateReviewAction(RATING_ID, 'remove');
    expect(res.ok).toBe(false);
    expect(rpc).not.toHaveBeenCalled();
  });

  it('refuses a signed-out caller', async () => {
    vi.mocked(getCurrentUser).mockResolvedValue(null as never);
    expect((await moderateReviewAction(RATING_ID, 'restore')).ok).toBe(false);
    expect(rpc).not.toHaveBeenCalled();
  });

  it('validates the id and action before any I/O', async () => {
    expect((await moderateReviewAction('not-a-uuid', 'hide')).ok).toBe(false);
    expect((await moderateReviewAction(RATING_ID, 'nuke' as never)).ok).toBe(
      false,
    );
    expect(getCurrentUser).not.toHaveBeenCalled();
    expect(rpc).not.toHaveBeenCalled();
  });

  it('honours the rate limit', async () => {
    vi.mocked(rateLimit).mockReturnValue({ allowed: false } as never);
    expect((await moderateReviewAction(RATING_ID, 'hide')).ok).toBe(false);
    expect(rpc).not.toHaveBeenCalled();
  });

  it('reports a review that already moved instead of claiming success', async () => {
    rpc.mockResolvedValue({ data: false, error: null });
    const res = await moderateReviewAction(RATING_ID, 'restore');
    expect(res.ok).toBe(false);
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it('surfaces the RPC hint on error', async () => {
    rpc.mockResolvedValue({
      data: null,
      error: { message: 'FORBIDDEN', hint: 'Admins only' },
    });
    expect(await moderateReviewAction(RATING_ID, 'hide')).toEqual({
      ok: false,
      error: 'Admins only',
    });
  });
});
