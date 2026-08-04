/**
 * Event review actions.
 *
 * The claims under test: a rejection always carries a reason, a decision
 * always tells the owner, and a failed notification never undoes the decision
 * it describes.
 *
 * Also that the admin check is re-derived here. The `[adminId]` layout guards
 * navigation; it does not guard a POST to one of these endpoints.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { verifyCurrentUserIsAdmin } from '@/lib/api/admin/adminActionHelpers';
import { getCurrentUser } from '@/lib/api/getCurrentUser';
import { getEventsEnabled } from '@/lib/api/appSettings';
import { emitNotification } from '@/lib/api/notifications/notificationsService';
import { getBusinessById } from '@/lib/api/business/businessQuery';
import * as eventService from '@/lib/api/events/eventService';

vi.mock('@/lib/api/admin/adminActionHelpers');
vi.mock('@/lib/api/getCurrentUser');
vi.mock('@/lib/api/appSettings');
vi.mock('@/lib/api/notifications/notificationsService');
vi.mock('@/lib/api/business/businessQuery');
vi.mock('@/lib/api/events/eventService');
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));

import {
  decideEventAction,
  setEventPriorityAction,
  createPlatformEventAction,
  updatePlatformEventAction,
  archivePlatformEventAction,
} from '../eventReviewActions';

const ADMIN_ID = '550e8400-e29b-41d4-a716-4466554400aa';
const EVENT_ID = '550e8400-e29b-41d4-a716-446655440001';
const BUSINESS_ID = '550e8400-e29b-41d4-a716-446655440000';
const OWNER_ID = '550e8400-e29b-41d4-a716-4466554400bb';

const EVENT = {
  id: EVENT_ID,
  business_id: BUSINESS_ID,
  name: 'Dinagyang street party',
  priority: 0,
} as never;

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(getEventsEnabled).mockResolvedValue(true);
  vi.mocked(verifyCurrentUserIsAdmin).mockResolvedValue({ authorized: true });
  vi.mocked(getCurrentUser).mockResolvedValue({
    id: ADMIN_ID,
    role: 'admin',
  } as never);
  vi.mocked(getBusinessById).mockResolvedValue({
    business: { id: BUSINESS_ID, owner_id: OWNER_ID },
    error: null,
  } as never);
  vi.mocked(emitNotification).mockResolvedValue({
    success: true,
    data: { id: 'notif-1' },
  });
  vi.mocked(eventService.decideEvent).mockResolvedValue({
    success: true,
    data: EVENT,
  });
  vi.mocked(eventService.setEventPriority).mockResolvedValue({
    success: true,
    data: EVENT,
  });
  vi.mocked(eventService.createPlatformEvent).mockResolvedValue({
    success: true,
    data: EVENT,
  });
  vi.mocked(eventService.updatePlatformEvent).mockResolvedValue({
    success: true,
    data: EVENT,
  });
  vi.mocked(eventService.archivePlatformEvent).mockResolvedValue({
    success: true,
    data: null,
  });
});

describe('authorization', () => {
  it('refuses a non-admin', async () => {
    vi.mocked(verifyCurrentUserIsAdmin).mockResolvedValue({
      authorized: false,
      error: 'Unauthorized',
    });

    const result = await decideEventAction(EVENT_ID, { decision: 'approve' });

    expect(result.error?.code).toBe('UNAUTHORIZED');
    expect(eventService.decideEvent).not.toHaveBeenCalled();
  });

  it('refuses every action when the kill switch is off', async () => {
    vi.mocked(getEventsEnabled).mockResolvedValue(false);

    const results = await Promise.all([
      decideEventAction(EVENT_ID, { decision: 'approve' }),
      setEventPriorityAction(EVENT_ID, 5),
    ]);

    for (const result of results) expect(result.error?.code).toBe('NOT_FOUND');
    expect(eventService.decideEvent).not.toHaveBeenCalled();
  });
});

describe('decideEventAction', () => {
  it('refuses a rejection with no reason — server-side, not just in the form', async () => {
    const result = await decideEventAction(EVENT_ID, { decision: 'reject' });

    expect(result.error?.code).toBe('VALIDATION_ERROR');
    expect(eventService.decideEvent).not.toHaveBeenCalled();
  });

  it('refuses a whitespace-only reason', async () => {
    const result = await decideEventAction(EVENT_ID, {
      decision: 'reject',
      remarks: '   ',
    });
    expect(result.error?.code).toBe('VALIDATION_ERROR');
  });

  it('allows approving without a note', async () => {
    const result = await decideEventAction(EVENT_ID, { decision: 'approve' });

    expect(result.success).toBe(true);
    expect(eventService.decideEvent).toHaveBeenCalledWith(
      EVENT_ID,
      ADMIN_ID,
      'approve',
      undefined,
      undefined,
    );
  });

  it('tells the owner, carrying the note in metadata.remarks', async () => {
    await decideEventAction(EVENT_ID, {
      decision: 'reject',
      note: 'The venue address is incomplete.',
    });

    expect(emitNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: OWNER_ID,
        type: 'event_proposal_rejected',
        business_id: BUSINESS_ID,
        actor_id: ADMIN_ID,
        metadata: expect.objectContaining({
          event_id: EVENT_ID,
          // The key NotificationRow already renders in italics — no new
          // column, no new component.
          remarks: 'The venue address is incomplete.',
        }),
      }),
    );
  });

  it('sends the approved type on approve', async () => {
    await decideEventAction(EVENT_ID, { decision: 'approve' });

    expect(emitNotification).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'event_proposal_approved' }),
    );
  });

  it('still succeeds when the notification fails', async () => {
    vi.mocked(emitNotification).mockResolvedValue({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'nope' },
    });

    const result = await decideEventAction(EVENT_ID, { decision: 'approve' });

    // A notification that does not arrive must not undo the review.
    expect(result.success).toBe(true);
  });

  it('still succeeds when the owner lookup throws', async () => {
    vi.mocked(getBusinessById).mockRejectedValue(new Error('boom'));

    const result = await decideEventAction(EVENT_ID, { decision: 'approve' });

    expect(result.success).toBe(true);
  });

  it('notifies nobody for a platform event — there is no owner', async () => {
    vi.mocked(eventService.decideEvent).mockResolvedValue({
      success: true,
      data: { ...EVENT, business_id: null } as never,
    });

    await decideEventAction(EVENT_ID, { decision: 'approve' });

    expect(emitNotification).not.toHaveBeenCalled();
  });

  it('does not notify when the decision itself failed', async () => {
    vi.mocked(eventService.decideEvent).mockResolvedValue({
      success: false,
      error: { code: 'NOT_FOUND', message: 'Already decided.' },
    });

    const result = await decideEventAction(EVENT_ID, { decision: 'approve' });

    expect(result.success).toBe(false);
    expect(emitNotification).not.toHaveBeenCalled();
  });

  it('rejects a malformed event id', async () => {
    const result = await decideEventAction('not-a-uuid', {
      decision: 'approve',
    });
    expect(result.error?.code).toBe('VALIDATION_ERROR');
  });
});

describe('setEventPriorityAction', () => {
  it('bounds the value', async () => {
    for (const bad of [-1, 101, 1.5]) {
      const result = await setEventPriorityAction(EVENT_ID, bad);
      expect(result.error?.code).toBe('VALIDATION_ERROR');
    }
    expect(eventService.setEventPriority).not.toHaveBeenCalled();
  });

  it('passes a valid value through', async () => {
    const result = await setEventPriorityAction(EVENT_ID, 5);
    expect(result.success).toBe(true);
    expect(eventService.setEventPriority).toHaveBeenCalledWith(EVENT_ID, 5);
  });
});

describe('createPlatformEventAction', () => {
  const VALID = {
    name: 'Iloilo food crawl',
    address: 'City Proper',
    starts_at: '2026-08-07T02:00:00.000Z',
    ends_at: '2026-08-09T14:00:00.000Z',
  };

  it('publishes straight away — an admin authoring IS the review', async () => {
    const result = await createPlatformEventAction(VALID);

    expect(result.success).toBe(true);
    expect(eventService.createPlatformEvent).toHaveBeenCalledWith(
      expect.objectContaining({ name: VALID.name }),
      'approved',
    );
  });

  it('drops a product_id — a platform event promotes no shop offering', async () => {
    await createPlatformEventAction({
      ...VALID,
      product_id: '550e8400-e29b-41d4-a716-4466554400cc',
    });

    const payload = vi.mocked(eventService.createPlatformEvent).mock
      .calls[0][0] as Record<string, unknown>;
    expect(payload.product_id).toBeNull();
  });

  it('rejects a javascript: link before the DB sees it', async () => {
    const result = await createPlatformEventAction({
      ...VALID,
      link_url: 'javascript:alert(1)',
    });

    expect(result.error?.code).toBe('VALIDATION_ERROR');
    expect(eventService.createPlatformEvent).not.toHaveBeenCalled();
  });

  it('validates before it authorises', async () => {
    const result = await createPlatformEventAction({ name: '' });

    expect(result.error?.code).toBe('VALIDATION_ERROR');
    expect(getEventsEnabled).not.toHaveBeenCalled();
    expect(verifyCurrentUserIsAdmin).not.toHaveBeenCalled();
  });

  it('refuses a non-admin', async () => {
    vi.mocked(verifyCurrentUserIsAdmin).mockResolvedValue({
      authorized: false,
      error: 'Unauthorized',
    });

    const result = await createPlatformEventAction(VALID);

    expect(result.error?.code).toBe('UNAUTHORIZED');
    expect(eventService.createPlatformEvent).not.toHaveBeenCalled();
  });
});

describe('the staff-pick edit and takedown paths', () => {
  it('refuses a non-admin on both', async () => {
    vi.mocked(verifyCurrentUserIsAdmin).mockResolvedValue({
      authorized: false,
      error: 'Unauthorized',
    });

    const results = await Promise.all([
      updatePlatformEventAction(EVENT_ID, { name: 'x' }),
      archivePlatformEventAction(EVENT_ID),
    ]);

    for (const result of results)
      expect(result.error?.code).toBe('UNAUTHORIZED');
    expect(eventService.updatePlatformEvent).not.toHaveBeenCalled();
    expect(eventService.archivePlatformEvent).not.toHaveBeenCalled();
  });

  it('refuses both when the kill switch is off', async () => {
    vi.mocked(getEventsEnabled).mockResolvedValue(false);

    const results = await Promise.all([
      updatePlatformEventAction(EVENT_ID, { name: 'x' }),
      archivePlatformEventAction(EVENT_ID),
    ]);

    for (const result of results) expect(result.error?.code).toBe('NOT_FOUND');
    expect(eventService.updatePlatformEvent).not.toHaveBeenCalled();
    expect(eventService.archivePlatformEvent).not.toHaveBeenCalled();
  });

  it('rejects a malformed id on both', async () => {
    expect(
      (await updatePlatformEventAction('nope', { name: 'x' })).error?.code,
    ).toBe('VALIDATION_ERROR');
    expect((await archivePlatformEventAction('nope')).error?.code).toBe(
      'VALIDATION_ERROR',
    );
  });

  it('passes the validated payload through to the scoped service', async () => {
    const result = await updatePlatformEventAction(EVENT_ID, {
      name: 'Renamed',
    });

    expect(result.success).toBe(true);
    expect(eventService.updatePlatformEvent).toHaveBeenCalledWith(
      EVENT_ID,
      expect.objectContaining({ name: 'Renamed' }),
    );
  });

  it('archives by id alone — the service owns the platform-only scope', async () => {
    const result = await archivePlatformEventAction(EVENT_ID);

    expect(result.success).toBe(true);
    expect(eventService.archivePlatformEvent).toHaveBeenCalledWith(EVENT_ID);
  });
});
