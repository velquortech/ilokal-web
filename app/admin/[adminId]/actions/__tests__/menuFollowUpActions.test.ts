import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * The action's write path is an atomic claim:
 *   admin.from('businesses').update({sent_at}).eq('id',id).or(cooldown).select('id')
 * and, on a failed send, a restore:
 *   admin.from('businesses').update({sent_at: prior}).eq('id',id)
 *
 * So `eq()` must serve two shapes — a claim (`.or().select()`) and an awaitable
 * restore. It returns a Promise (for the restore await) with `.or` attached
 * (for the claim). `claimRows` / `sendResult` are the per-test knobs.
 */
const { getCurrentUser, sendEmail, missingIds, rpc, update, state } =
  vi.hoisted(() => {
    const state = {
      claimRows: [{ id: 'x' }] as { id: string }[],
      claimError: null as unknown,
      restoreError: null as unknown,
    };
    const select = vi.fn(() =>
      Promise.resolve({ data: state.claimRows, error: state.claimError }),
    );
    const or = vi.fn(() => ({ select }));
    const eq = vi.fn(() => {
      const p = Promise.resolve({ error: state.restoreError });
      return Object.assign(p, { or, select });
    });
    const update = vi.fn(() => ({ eq }));
    const rpc = vi.fn();
    return {
      getCurrentUser: vi.fn(),
      sendEmail: vi.fn(),
      missingIds: vi.fn(),
      rpc,
      update,
      state,
      adminClient: { rpc, from: vi.fn(() => ({ update })) },
    };
  });

vi.mock('@/lib/api/getCurrentUser', () => ({ getCurrentUser }));
vi.mock('@/supabase/server', () => ({
  createServerAdminClient: vi.fn(async () => ({
    rpc,
    from: vi.fn(() => ({ update })),
  })),
}));
vi.mock('@/app/api/emails/sendMenuFollowUp', () => ({
  sendMenuFollowUpEmail: sendEmail,
}));
vi.mock('@/lib/api/admin/menuFollowUpQuery', () => ({
  getMissingMenuIds: missingIds,
}));
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));

import {
  sendMenuFollowUpAction,
  sendMenuFollowUpBatchAction,
  sendMenuFollowUpAllAction,
} from '../menuFollowUpActions';

const BIZ = '550e8400-e29b-41d4-a716-446655440000';
const BIZ2 = '550e8400-e29b-41d4-a716-4466554400aa';

function target(over: Record<string, unknown> = {}) {
  return {
    shop_name: 'Cafe',
    owner_email: 'owner@x.co',
    owner_name: 'Ana',
    offering_noun: 'Menu',
    offering_plural: 'Menu Items',
    has_live_menu: false,
    menu_reminder_sent_at: null,
    is_sendable: true,
    ...over,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  getCurrentUser.mockResolvedValue({
    id: `admin-${Math.random()}`,
    role: 'admin',
  });
  rpc.mockResolvedValue({ data: [target()], error: null });
  sendEmail.mockResolvedValue({ sent: true });
  missingIds.mockResolvedValue([BIZ, BIZ2]);
  state.claimRows = [{ id: BIZ }];
  state.claimError = null;
  state.restoreError = null;
  process.env.NEXT_PUBLIC_APP_URL = 'https://ilokal.ph';
});

describe('sendMenuFollowUpAction — authorization', () => {
  it('refuses a non-admin before any send', async () => {
    getCurrentUser.mockResolvedValue({ id: 'u', role: 'business_owner' });

    const res = await sendMenuFollowUpAction(BIZ);

    expect(res.ok).toBe(false);
    expect(sendEmail).not.toHaveBeenCalled();
    expect(rpc).not.toHaveBeenCalled();
  });

  it('refuses a malformed id before the admin check', async () => {
    const res = await sendMenuFollowUpAction('not-a-uuid');

    expect(res.ok).toBe(false);
    expect(getCurrentUser).not.toHaveBeenCalled();
  });
});

describe('sendMenuFollowUpAction — the send-time re-check', () => {
  it('claims, sends, and does not restore on success', async () => {
    const res = await sendMenuFollowUpAction(BIZ);

    expect(res.outcome?.status).toBe('sent');
    expect(sendEmail).toHaveBeenCalledTimes(1);
    const arg = sendEmail.mock.calls[0]![0] as { ctaUrl: string };
    expect(arg.ctaUrl).toBe(
      `https://ilokal.ph/business/${BIZ}/product-catalogues`,
    );
    // The claim wrote a fresh timestamp; the success path never restores.
    expect(update).toHaveBeenCalledTimes(1);
    expect(update.mock.calls[0]![0]).toMatchObject({
      menu_reminder_sent_at: expect.any(String),
    });
  });

  it('skips a shop that has since added a menu, without claiming', async () => {
    rpc.mockResolvedValue({
      data: [target({ is_sendable: false, has_live_menu: true })],
      error: null,
    });

    const res = await sendMenuFollowUpAction(BIZ);

    expect(res.outcome).toMatchObject({
      status: 'skipped',
      reason: 'ALREADY_HAS_MENU',
    });
    expect(sendEmail).not.toHaveBeenCalled();
    expect(update).not.toHaveBeenCalled();
  });

  it('skips a shop with no owner email', async () => {
    rpc.mockResolvedValue({ data: [target({ owner_email: '' })], error: null });

    const res = await sendMenuFollowUpAction(BIZ);

    expect(res.outcome).toMatchObject({
      status: 'skipped',
      reason: 'NO_EMAIL',
    });
    expect(sendEmail).not.toHaveBeenCalled();
  });

  it('skips when the atomic claim wins nothing (someone else has it)', async () => {
    // The conditional UPDATE returned no row — a concurrent send already
    // claimed the cooldown slot.
    state.claimRows = [];

    const res = await sendMenuFollowUpAction(BIZ);

    expect(res.outcome).toMatchObject({
      status: 'skipped',
      reason: 'RECENTLY_SENT',
    });
    expect(sendEmail).not.toHaveBeenCalled();
  });

  it('restores the prior marker when the email fails', async () => {
    rpc.mockResolvedValue({
      data: [target({ menu_reminder_sent_at: '2026-01-01T00:00:00Z' })],
      error: null,
    });
    sendEmail.mockResolvedValue({ sent: false });

    const res = await sendMenuFollowUpAction(BIZ);

    expect(res.outcome).toMatchObject({
      status: 'failed',
      reason: 'SEND_FAILED',
    });
    // Two writes: the claim, then the restore back to the prior value.
    expect(update).toHaveBeenCalledTimes(2);
    expect(update.mock.calls[1]![0]).toEqual({
      menu_reminder_sent_at: '2026-01-01T00:00:00Z',
    });
  });

  it('reports NOT_FOUND for an unknown shop', async () => {
    rpc.mockResolvedValue({ data: [], error: null });

    const res = await sendMenuFollowUpAction(BIZ);

    expect(res.outcome).toMatchObject({
      status: 'skipped',
      reason: 'NOT_FOUND',
    });
  });
});

describe('sendMenuFollowUpBatchAction', () => {
  it('refuses a non-admin', async () => {
    getCurrentUser.mockResolvedValue({ id: 'u', role: 'business_owner' });

    const res = await sendMenuFollowUpBatchAction([BIZ, BIZ2]);

    expect(res.ok).toBe(false);
    expect(sendEmail).not.toHaveBeenCalled();
  });

  it('counts sent / skipped across the batch and dedupes', async () => {
    rpc
      .mockResolvedValueOnce({ data: [target()], error: null })
      .mockResolvedValueOnce({
        data: [target({ is_sendable: false })],
        error: null,
      });

    const res = await sendMenuFollowUpBatchAction([BIZ, BIZ, BIZ2]);

    expect(res.ok).toBe(true);
    expect(res.sent).toBe(1);
    expect(res.skipped).toBe(1);
    expect(res.outcomes).toHaveLength(2);
  });

  it('rejects an empty selection', async () => {
    const res = await sendMenuFollowUpBatchAction([]);
    expect(res.ok).toBe(false);
  });
});

describe('sendMenuFollowUpAllAction', () => {
  it('derives ids SERVER-SIDE from the filter, not the client', async () => {
    const res = await sendMenuFollowUpAllAction({
      search: 'cafe',
      onlyNoPromo: true,
    });

    expect(missingIds).toHaveBeenCalledWith({
      search: 'cafe',
      onlyNoPromo: true,
    });
    expect(res.ok).toBe(true);
    // Both server-derived ids were processed.
    expect(res.outcomes).toHaveLength(2);
  });

  it('refuses a non-admin before deriving anything', async () => {
    getCurrentUser.mockResolvedValue({ id: 'u', role: 'business_owner' });

    const res = await sendMenuFollowUpAllAction({});

    expect(res.ok).toBe(false);
    expect(missingIds).not.toHaveBeenCalled();
  });

  it('is a clean no-op when the filter matches nothing', async () => {
    missingIds.mockResolvedValue([]);

    const res = await sendMenuFollowUpAllAction({});

    expect(res.ok).toBe(true);
    expect(res.sent).toBe(0);
    expect(sendEmail).not.toHaveBeenCalled();
  });
});
