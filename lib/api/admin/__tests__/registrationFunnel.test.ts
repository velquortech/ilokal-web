/**
 * getRegistrationFunnel — the dashboard's read of registration_funnel_report().
 *
 * What matters: only an admin reaches the RLS-bypassing client, only app refs
 * reach the card, each gets a label staff can read, and a failed read is
 * reported as failed rather than as a funnel of zeros.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Mock } from 'vitest';

import { getRegistrationFunnel } from '../analyticsQuery';
import { createAnalyticsSupabaseClient } from '@/supabase/server';
import { assertAuthorized } from '@/lib/utils/auth';

vi.mock('@/supabase/server', () => ({
  createAnalyticsSupabaseClient: vi.fn(),
  createServerSupabaseClient: vi.fn(),
}));
vi.mock('@/lib/utils/auth', () => ({ assertAuthorized: vi.fn() }));

const row = (ref: string, n: number[]) => ({
  ref,
  taps: n[0] + 2,
  visitors: n[0],
  signups: n[1],
  started: n[2],
  completed: n[3],
});

function mockRpc(result: { data: unknown; error: unknown }) {
  const rpc = vi.fn().mockResolvedValue(result);
  (createAnalyticsSupabaseClient as unknown as Mock).mockResolvedValue({ rpc });
  return rpc;
}

describe('getRegistrationFunnel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (assertAuthorized as unknown as Mock).mockResolvedValue({
      authorized: true,
    });
  });

  it('labels the app sources and totals them', async () => {
    const rpc = mockRpc({
      data: [row('app_profile', [18, 7, 5, 3]), row('app_guest', [6, 2, 1, 1])],
      error: null,
    });

    const funnel = await getRegistrationFunnel(30);

    expect(funnel.failed).toBe(false);
    expect(funnel.days).toBe(30);
    expect(funnel.sources.map((s) => s.label)).toEqual([
      'App · Profile tab',
      'App · Guest prompt',
    ]);
    expect(funnel.totals).toEqual({
      visitors: 24,
      signups: 9,
      started: 6,
      completed: 4,
    });
    expect(rpc).toHaveBeenCalledWith('registration_funnel_report', {
      p_since: expect.any(String),
    });
  });

  it('keeps refs from other campaigns off the app card', async () => {
    mockRpc({
      data: [row('app_profile', [3, 1, 1, 0]), row('fb_launch', [50, 9, 4, 2])],
      error: null,
    });

    const funnel = await getRegistrationFunnel(30);

    expect(funnel.sources.map((s) => s.ref)).toEqual(['app_profile']);
    expect(funnel.totals.visitors).toBe(3);
  });

  it('shows an unknown app ref by name rather than dropping it', async () => {
    mockRpc({ data: [row('app_events_tab', [4, 1, 0, 0])], error: null });

    const funnel = await getRegistrationFunnel(30);

    expect(funnel.sources[0].label).toBe('App · events tab');
  });

  it('reports a failed read as failed, never as zeros', async () => {
    mockRpc({ data: null, error: { message: 'boom' } });
    vi.spyOn(console, 'error').mockImplementation(() => {});

    const funnel = await getRegistrationFunnel(30);

    expect(funnel.failed).toBe(true);
    expect(funnel.sources).toEqual([]);
  });

  it('never builds the privileged client for a non-admin', async () => {
    (assertAuthorized as unknown as Mock).mockResolvedValue({
      authorized: false,
    });

    const funnel = await getRegistrationFunnel(30);

    expect(funnel.failed).toBe(true);
    expect(createAnalyticsSupabaseClient).not.toHaveBeenCalled();
  });
});
