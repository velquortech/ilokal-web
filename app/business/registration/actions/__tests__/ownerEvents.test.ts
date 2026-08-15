/**
 * `logOwnerEvent` is fire-and-forget by contract: the registration wizard and
 * dashboard must behave identically whether the table exists or not. These
 * tests pin the two ways it must never break the caller — a missing session
 * is a silent no-op, and an insert failure is logged and swallowed.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

const mocks = vi.hoisted(() => ({
  createClient: vi.fn(),
  logActionError: vi.fn(),
}));

vi.mock('@/supabase/server', () => ({
  createServerSupabaseClient: mocks.createClient,
}));

vi.mock('@/lib/utils/captureError', () => ({
  logActionError: mocks.logActionError,
}));

async function loadAction() {
  const { logOwnerEvent } = await import('../ownerEvents');
  return logOwnerEvent;
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('logOwnerEvent', () => {
  it('inserts a row attributed to the current owner when signed in', async () => {
    const insert = vi.fn(async () => ({ error: null }));
    mocks.createClient.mockResolvedValue({
      auth: { getUser: vi.fn(async () => ({ data: { user: { id: 'u-1' } } })) },
      from: vi.fn(() => ({ insert })),
    });

    const logOwnerEvent = await loadAction();
    await logOwnerEvent('reg_step_viewed', { step: 2 }, 'b-1');

    expect(insert).toHaveBeenCalledWith({
      owner_id: 'u-1',
      business_id: 'b-1',
      event: 'reg_step_viewed',
      payload: { step: 2 },
    });
    expect(mocks.logActionError).not.toHaveBeenCalled();
  });

  it('is a silent no-op without a session', async () => {
    const from = vi.fn();
    mocks.createClient.mockResolvedValue({
      auth: {
        getUser: vi.fn(async () => ({ data: { user: null } })),
      },
      from,
    });

    const logOwnerEvent = await loadAction();
    await logOwnerEvent('reg_step_viewed', { step: 1 });

    // No insert attempted, no error reported — an anonymous visitor is not a
    // funnel entry and must not trip monitoring.
    expect(from).not.toHaveBeenCalled();
    expect(mocks.logActionError).not.toHaveBeenCalled();
  });

  it('swallows an insert failure instead of throwing to the caller', async () => {
    mocks.createClient.mockResolvedValue({
      auth: { getUser: vi.fn(async () => ({ data: { user: { id: 'u-1' } } })) },
      from: vi.fn(() => ({
        insert: vi.fn(async () => ({ error: new Error('boom') })),
      })),
    });

    const logOwnerEvent = await loadAction();
    // Must resolve — never reject — so the wizard cannot be broken by the
    // funnel.
    await expect(
      logOwnerEvent('reg_submitted', { with_deal: false }),
    ).resolves.toBeUndefined();
    expect(mocks.logActionError).toHaveBeenCalled();
  });
});
