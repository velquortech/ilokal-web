/**
 * Event proposal actions.
 *
 * These are publicly invocable endpoints, so the tests are about the ORDER of
 * the gate as much as its presence: validation before auth, the kill switch
 * before any DB work, and the VERIFIED business id — never a client-supplied
 * one — reaching the service.
 *
 * The other claim under test: a draft never pings the admins. Without that,
 * the notify RPC is a button an owner can hold down.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { verifyBusinessOwner } from '@/lib/api/verifyBusinessOwner';
import { getEventsEnabled } from '@/lib/api/appSettings';
import * as eventService from '@/lib/api/events/eventService';

vi.mock('@/lib/api/verifyBusinessOwner');
vi.mock('@/lib/api/appSettings');
vi.mock('@/lib/api/events/eventService');
vi.mock('@/supabase/server', () => ({ createServerSupabaseClient: vi.fn() }));
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));

import {
  createEventAction,
  updateEventAction,
  setEventStatusAction,
  archiveEventAction,
} from '../eventActions';

const BUSINESS_ID = '550e8400-e29b-41d4-a716-446655440000';
const EVENT_ID = '550e8400-e29b-41d4-a716-446655440001';
const OTHER_BUSINESS = '550e8400-e29b-41d4-a716-4466554400ff';

const VALID_INPUT = {
  name: 'Dinagyang street party',
  address: 'Iznart St, Iloilo City',
  starts_at: '2026-08-07T02:00:00.000Z',
  ends_at: '2026-08-09T14:00:00.000Z',
};

function mockAuthorized(userId = 'user-1') {
  vi.mocked(verifyBusinessOwner).mockResolvedValue({
    authorized: true,
    business: { id: BUSINESS_ID },
    user: { id: userId },
  } as unknown as Awaited<ReturnType<typeof verifyBusinessOwner>>);
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(getEventsEnabled).mockResolvedValue(true);
  mockAuthorized();
  vi.mocked(eventService.createEvent).mockResolvedValue({
    success: true,
    data: { id: EVENT_ID } as never,
  });
  vi.mocked(eventService.updateEvent).mockResolvedValue({
    success: true,
    data: { id: EVENT_ID } as never,
  });
  vi.mocked(eventService.setOwnerEventStatus).mockResolvedValue({
    success: true,
    data: { id: EVENT_ID } as never,
  });
  vi.mocked(eventService.archiveEvent).mockResolvedValue({
    success: true,
    data: null,
  });
  vi.mocked(eventService.notifyProposalSubmitted).mockResolvedValue(2);
});

describe('the kill switch is enforced server-side', () => {
  it('refuses every write when the flag is off', async () => {
    vi.mocked(getEventsEnabled).mockResolvedValue(false);

    const results = await Promise.all([
      createEventAction(BUSINESS_ID, VALID_INPUT),
      updateEventAction(BUSINESS_ID, EVENT_ID, { name: 'x' }),
      setEventStatusAction(BUSINESS_ID, EVENT_ID, 'pending_review'),
      archiveEventAction(BUSINESS_ID, EVENT_ID),
    ]);

    for (const result of results) {
      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('NOT_FOUND');
    }
    expect(eventService.createEvent).not.toHaveBeenCalled();
    expect(eventService.updateEvent).not.toHaveBeenCalled();
    // Hiding the nav entry stops an honest owner; it does not stop a POST.
  });
});

describe('createEventAction', () => {
  it('validates before it authorises', async () => {
    const result = await createEventAction(BUSINESS_ID, { name: '' });

    expect(result.error?.code).toBe('VALIDATION_ERROR');
    expect(getEventsEnabled).not.toHaveBeenCalled();
    expect(verifyBusinessOwner).not.toHaveBeenCalled();
  });

  it('verifies the business from the route segment, not whichever shop comes first', async () => {
    await createEventAction(BUSINESS_ID, VALID_INPUT);

    // Called with NO argument, `verifyBusinessOwner` falls back to whatever
    // `.limit(1)` returns — so an owner with two shops filed events against
    // the wrong one.
    expect(verifyBusinessOwner).toHaveBeenCalledWith(BUSINESS_ID);
  });

  it('uses the verified business id, never one from the caller', async () => {
    await createEventAction(BUSINESS_ID, {
      ...VALID_INPUT,
      business_id: OTHER_BUSINESS,
    });

    expect(eventService.createEvent).toHaveBeenCalledWith(
      BUSINESS_ID,
      expect.objectContaining({ name: VALID_INPUT.name }),
      'pending_review',
    );
    // The stray key is not in the parsed payload at all.
    const payload = vi.mocked(eventService.createEvent).mock.calls[0][1];
    expect(payload).not.toHaveProperty('business_id');
  });

  it('notifies the admins when the proposal is submitted', async () => {
    await createEventAction(BUSINESS_ID, VALID_INPUT, true);
    expect(eventService.notifyProposalSubmitted).toHaveBeenCalledWith(EVENT_ID);
  });

  it('does NOT notify anyone for a draft', async () => {
    await createEventAction(BUSINESS_ID, VALID_INPUT, false);

    expect(eventService.createEvent).toHaveBeenCalledWith(
      BUSINESS_ID,
      expect.anything(),
      'draft',
    );
    expect(eventService.notifyProposalSubmitted).not.toHaveBeenCalled();
  });

  it('still succeeds when the notification fails', async () => {
    vi.mocked(eventService.notifyProposalSubmitted).mockResolvedValue(0);

    const result = await createEventAction(BUSINESS_ID, VALID_INPUT);

    // A notification that does not arrive must not fail the proposal.
    expect(result.success).toBe(true);
  });

  it('rejects a javascript: link before the DB sees it', async () => {
    const result = await createEventAction(BUSINESS_ID, {
      ...VALID_INPUT,
      link_url: 'javascript:alert(1)',
    });

    expect(result.error?.code).toBe('VALIDATION_ERROR');
    expect(eventService.createEvent).not.toHaveBeenCalled();
  });

  it('surfaces the authorization error unchanged', async () => {
    vi.mocked(verifyBusinessOwner).mockResolvedValue({
      authorized: false,
      error: { code: 'UNAUTHORIZED', message: 'Not authorized' },
    } as unknown as Awaited<ReturnType<typeof verifyBusinessOwner>>);

    const result = await createEventAction(BUSINESS_ID, VALID_INPUT);

    expect(result.error?.code).toBe('UNAUTHORIZED');
    expect(eventService.createEvent).not.toHaveBeenCalled();
  });
});

describe('setEventStatusAction', () => {
  it.each(['draft', 'pending_review'])('allows %s', async (status) => {
    const result = await setEventStatusAction(BUSINESS_ID, EVENT_ID, status);

    expect(result.success).toBe(true);
    expect(eventService.setOwnerEventStatus).toHaveBeenCalledWith(
      EVENT_ID,
      BUSINESS_ID,
      status,
    );
  });

  it.each(['approved', 'rejected', 'anything'])(
    'refuses %s — an owner cannot decide their own proposal',
    async (status) => {
      const result = await setEventStatusAction(BUSINESS_ID, EVENT_ID, status);

      expect(result.error?.code).toBe('VALIDATION_ERROR');
      expect(eventService.setOwnerEventStatus).not.toHaveBeenCalled();
    },
  );

  it('notifies on submit but not on withdraw', async () => {
    await setEventStatusAction(BUSINESS_ID, EVENT_ID, 'pending_review');
    expect(eventService.notifyProposalSubmitted).toHaveBeenCalledTimes(1);

    vi.mocked(eventService.notifyProposalSubmitted).mockClear();
    await setEventStatusAction(BUSINESS_ID, EVENT_ID, 'draft');
    expect(eventService.notifyProposalSubmitted).not.toHaveBeenCalled();
  });

  it('rejects a malformed id', async () => {
    const result = await setEventStatusAction(
      BUSINESS_ID,
      'not-a-uuid',
      'draft',
    );
    expect(result.error?.code).toBe('VALIDATION_ERROR');
    expect(eventService.setOwnerEventStatus).not.toHaveBeenCalled();
  });
});

describe('updateEventAction and archiveEventAction scope by the verified id', () => {
  it('passes the verified business id to update', async () => {
    await updateEventAction(BUSINESS_ID, EVENT_ID, { name: 'Renamed' });
    expect(eventService.updateEvent).toHaveBeenCalledWith(
      EVENT_ID,
      BUSINESS_ID,
      expect.objectContaining({ name: 'Renamed' }),
    );
  });

  it('passes the verified business id to archive', async () => {
    await archiveEventAction(BUSINESS_ID, EVENT_ID);
    expect(eventService.archiveEvent).toHaveBeenCalledWith(
      EVENT_ID,
      BUSINESS_ID,
    );
  });

  it('rejects a malformed id on both', async () => {
    expect((await updateEventAction(BUSINESS_ID, 'nope', {})).error?.code).toBe(
      'VALIDATION_ERROR',
    );
    expect((await archiveEventAction(BUSINESS_ID, 'nope')).error?.code).toBe(
      'VALIDATION_ERROR',
    );
  });
});

describe('per-user flood guard', () => {
  it('rate-limits a burst of writes', async () => {
    const results = [];
    for (let i = 0; i < 40; i++) {
      results.push(await createEventAction(BUSINESS_ID, VALID_INPUT));
    }

    // Server-Action POSTs never reach the proxy limiter, so the budget has to
    // live in the action.
    expect(results.some((r) => r.error?.code === 'RATE_LIMITED')).toBe(true);
  });
});
