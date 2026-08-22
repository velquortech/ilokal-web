import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * The action touches three tables, so the client mock is table-aware:
 *
 *   profiles      — read the target, then the ATOMIC CLAIM
 *                   (`update().eq().or().select()`) and, on a failed send, the
 *                   restore (`update().eq()` awaited directly)
 *   businesses    — head count, the "have they registered since?" re-check
 *   owner_events  — furthest step, advisory only
 *
 * `eq()` on the claim path therefore has to serve two shapes: a thenable (the
 * awaited restore) with `.or` attached (the claim). `state` holds the per-test
 * knobs.
 */
const { getCurrentUser, sendEmail, missingIds, state, updateCalls } =
  vi.hoisted(() => {
    const state = {
      profile: null as Record<string, unknown> | null,
      profileError: null as unknown,
      liveCount: 0,
      liveCountError: null as unknown,
      events: [] as { payload: unknown }[],
      eventsError: null as unknown,
      claimRows: [{ id: 'x' }] as { id: string }[],
      claimError: null as unknown,
      restoreError: null as unknown,
    };
    const updateCalls: unknown[] = [];
    return {
      getCurrentUser: vi.fn(),
      sendEmail: vi.fn(),
      missingIds: vi.fn(),
      state,
      updateCalls,
    };
  });

vi.mock('@/lib/api/getCurrentUser', () => ({ getCurrentUser }));
vi.mock('@/supabase/server', () => ({
  createServerAdminClient: vi.fn(async () => ({
    from: (table: string) => {
      if (table === 'profiles') {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: () =>
                Promise.resolve({
                  data: state.profile,
                  error: state.profileError,
                }),
            }),
          }),
          update: (payload: unknown) => {
            updateCalls.push(payload);
            return {
              eq: () => {
                const restore = Promise.resolve({ error: state.restoreError });
                return Object.assign(restore, {
                  or: () => ({
                    select: () =>
                      Promise.resolve({
                        data: state.claimRows,
                        error: state.claimError,
                      }),
                  }),
                });
              },
            };
          },
        };
      }
      if (table === 'businesses') {
        return {
          select: () => ({
            eq: () => ({
              is: () =>
                Promise.resolve({
                  count: state.liveCount,
                  error: state.liveCountError,
                }),
            }),
          }),
        };
      }
      return {
        select: () => ({
          eq: () => ({
            in: () =>
              Promise.resolve({ data: state.events, error: state.eventsError }),
          }),
        }),
      };
    },
  })),
}));
vi.mock('@/app/api/emails/sendRegistrationFollowUp', () => ({
  sendRegistrationFollowUpEmail: sendEmail,
}));
vi.mock('@/lib/api/admin/registrationFollowUpQuery', () => ({
  getOwnersMissingBusinessIds: missingIds,
}));
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));

import {
  sendRegistrationFollowUpAction,
  sendRegistrationFollowUpBatchAction,
  sendRegistrationFollowUpAllAction,
} from '../registrationFollowUpActions';

const OWNER = '550e8400-e29b-41d4-a716-446655440000';
const OWNER2 = '550e8400-e29b-41d4-a716-4466554400aa';

function profile(over: Record<string, unknown> = {}) {
  return {
    id: OWNER,
    email: 'owner@x.co',
    full_name: 'Ana',
    role: 'business_owner',
    archived_at: null,
    registration_reminder_sent_at: null,
    ...over,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  updateCalls.length = 0;
  state.profile = profile();
  state.profileError = null;
  state.liveCount = 0;
  state.liveCountError = null;
  state.events = [];
  state.eventsError = null;
  state.claimRows = [{ id: 'x' }];
  state.claimError = null;
  state.restoreError = null;
  getCurrentUser.mockResolvedValue({ id: 'admin-1', role: 'admin' });
  sendEmail.mockResolvedValue({ sent: true });
  missingIds.mockResolvedValue([]);
  process.env.NEXT_PUBLIC_APP_URL = 'https://ilokal.ph';
});

describe('authorization', () => {
  it('refuses a non-admin without sending', async () => {
    getCurrentUser.mockResolvedValue({ id: 'u', role: 'business_owner' });
    const res = await sendRegistrationFollowUpAction(OWNER);
    expect(res).toEqual({ ok: false, error: 'Unauthorized' });
    expect(sendEmail).not.toHaveBeenCalled();
  });

  it('refuses an unauthenticated caller', async () => {
    getCurrentUser.mockResolvedValue(null);
    const res = await sendRegistrationFollowUpAction(OWNER);
    expect(res.ok).toBe(false);
    expect(sendEmail).not.toHaveBeenCalled();
  });

  it('rejects a non-uuid id before any auth or DB work', async () => {
    const res = await sendRegistrationFollowUpAction('not-a-uuid');
    expect(res).toEqual({ ok: false, error: 'Invalid owner id' });
    expect(getCurrentUser).not.toHaveBeenCalled();
  });
});

describe('send-time re-check — the list is a hint, not a gate', () => {
  it('skips an owner who has registered since the list was rendered', async () => {
    state.liveCount = 1;
    const res = await sendRegistrationFollowUpAction(OWNER);
    expect(res.outcome).toEqual({
      status: 'skipped',
      ownerId: OWNER,
      reason: 'ALREADY_REGISTERED',
    });
    expect(sendEmail).not.toHaveBeenCalled();
    // Nothing was claimed, so the owner is not silenced for a cooldown.
    expect(updateCalls).toHaveLength(0);
  });

  it('skips an archived account', async () => {
    state.profile = profile({ archived_at: '2026-08-01T00:00:00Z' });
    const res = await sendRegistrationFollowUpAction(OWNER);
    expect(res.outcome).toMatchObject({ reason: 'NOT_ELIGIBLE' });
    expect(sendEmail).not.toHaveBeenCalled();
  });

  it('skips an account whose role is no longer business_owner', async () => {
    state.profile = profile({ role: 'app_user' });
    const res = await sendRegistrationFollowUpAction(OWNER);
    expect(res.outcome).toMatchObject({ reason: 'NOT_ELIGIBLE' });
  });

  it('skips an owner with no email on file', async () => {
    state.profile = profile({ email: null });
    const res = await sendRegistrationFollowUpAction(OWNER);
    expect(res.outcome).toMatchObject({ reason: 'NO_EMAIL' });
  });

  it('skips a missing profile', async () => {
    state.profile = null;
    const res = await sendRegistrationFollowUpAction(OWNER);
    expect(res.outcome).toMatchObject({ reason: 'NOT_FOUND' });
  });

  it('fails (not skips) when the eligibility read errors', async () => {
    // An outage must not be reported as "nothing to send".
    state.liveCountError = { message: 'boom' };
    const res = await sendRegistrationFollowUpAction(OWNER);
    expect(res.outcome).toMatchObject({ reason: 'LOOKUP_FAILED' });
    expect(sendEmail).not.toHaveBeenCalled();
  });
});

describe('the atomic claim', () => {
  it('skips when the cooldown predicate matches no row', async () => {
    state.claimRows = [];
    const res = await sendRegistrationFollowUpAction(OWNER);
    expect(res.outcome).toMatchObject({ reason: 'RECENTLY_SENT' });
    expect(sendEmail).not.toHaveBeenCalled();
  });

  it('claims BEFORE sending, so two racing callers cannot both email', async () => {
    await sendRegistrationFollowUpAction(OWNER);
    expect(updateCalls).toHaveLength(1);
    expect(sendEmail).toHaveBeenCalledTimes(1);
  });

  it('restores the PRIOR marker when the send fails', async () => {
    // Otherwise a failed email silences the owner for a whole cooldown.
    const prior = '2026-07-01T00:00:00Z';
    state.profile = profile({ registration_reminder_sent_at: prior });
    sendEmail.mockResolvedValue({ sent: false });

    const res = await sendRegistrationFollowUpAction(OWNER);

    expect(res.outcome).toMatchObject({ reason: 'SEND_FAILED' });
    expect(updateCalls).toHaveLength(2);
    expect(updateCalls[1]).toEqual({
      registration_reminder_sent_at: prior,
    });
  });

  it('restores to null when there was no prior marker', async () => {
    sendEmail.mockResolvedValue({ sent: false });
    await sendRegistrationFollowUpAction(OWNER);
    expect(updateCalls[1]).toEqual({ registration_reminder_sent_at: null });
  });
});

describe('the email', () => {
  it('points at the registration wizard and carries the owner name', async () => {
    await sendRegistrationFollowUpAction(OWNER);
    expect(sendEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'owner@x.co',
        ctaUrl: 'https://ilokal.ph/business/registration',
        recipientName: 'Ana',
      }),
    );
  });

  it('passes the furthest recorded step', async () => {
    state.events = [
      { payload: { step: 2 } },
      { payload: { step: 5 } },
      { payload: { step: 3 } },
    ];
    await sendRegistrationFollowUpAction(OWNER);
    expect(sendEmail).toHaveBeenCalledWith(
      expect.objectContaining({ furthestStep: 5 }),
    );
  });

  it('leaves the step undefined when no event was recorded', async () => {
    await sendRegistrationFollowUpAction(OWNER);
    expect(sendEmail).toHaveBeenCalledWith(
      expect.objectContaining({ furthestStep: undefined }),
    );
  });

  it('still sends when the step lookup fails — it is advisory only', async () => {
    state.eventsError = { message: 'boom' };
    const res = await sendRegistrationFollowUpAction(OWNER);
    expect(res.outcome).toMatchObject({ status: 'sent' });
    expect(sendEmail).toHaveBeenCalledWith(
      expect.objectContaining({ furthestStep: undefined }),
    );
  });

  it('ignores a malformed step payload rather than sending NaN', async () => {
    state.events = [{ payload: { step: 'abc' } }, { payload: {} }];
    await sendRegistrationFollowUpAction(OWNER);
    expect(sendEmail).toHaveBeenCalledWith(
      expect.objectContaining({ furthestStep: undefined }),
    );
  });
});

describe('batch and send-to-all', () => {
  it('dedupes ids and reports per-status counts', async () => {
    const res = await sendRegistrationFollowUpBatchAction([
      OWNER,
      OWNER,
      OWNER2,
    ]);
    expect(res.ok).toBe(true);
    expect(res.sent).toBe(2);
    expect(sendEmail).toHaveBeenCalledTimes(2);
  });

  it('rejects a batch with no valid id', async () => {
    const res = await sendRegistrationFollowUpBatchAction(['nope']);
    expect(res.ok).toBe(false);
    expect(sendEmail).not.toHaveBeenCalled();
  });

  it('send-to-all derives ids server-side from the filter', async () => {
    missingIds.mockResolvedValue([OWNER]);
    const res = await sendRegistrationFollowUpAllAction({
      search: 'ana',
      onlyStarted: true,
    });
    expect(missingIds).toHaveBeenCalledWith({
      search: 'ana',
      onlyStarted: true,
    });
    expect(res.sent).toBe(1);
  });

  it('send-to-all is a successful no-op when the filter matches nobody', async () => {
    missingIds.mockResolvedValue([]);
    const res = await sendRegistrationFollowUpAllAction({});
    expect(res.ok).toBe(true);
    expect(res.sent).toBe(0);
    expect(sendEmail).not.toHaveBeenCalled();
  });

  it('refuses send-to-all for a non-admin before deriving any ids', async () => {
    getCurrentUser.mockResolvedValue({ id: 'u', role: 'app_user' });
    const res = await sendRegistrationFollowUpAllAction({});
    expect(res.ok).toBe(false);
    expect(missingIds).not.toHaveBeenCalled();
  });
});
