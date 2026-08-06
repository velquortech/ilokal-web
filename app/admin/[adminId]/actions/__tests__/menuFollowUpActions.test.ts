import { describe, it, expect, vi, beforeEach } from 'vitest';

const { getCurrentUser, sendEmail, adminClient, rpc, update } = vi.hoisted(
  () => {
    const eq = vi.fn().mockResolvedValue({ error: null });
    const update = vi.fn(() => ({ eq }));
    const rpc = vi.fn();
    return {
      getCurrentUser: vi.fn(),
      sendEmail: vi.fn(),
      adminClient: { rpc, from: vi.fn(() => ({ update })) },
      rpc,
      update,
    };
  },
);

vi.mock('@/lib/api/getCurrentUser', () => ({ getCurrentUser }));
vi.mock('@/supabase/server', () => ({
  createServerAdminClient: vi.fn(async () => adminClient),
}));
vi.mock('@/app/api/emails/sendMenuFollowUp', () => ({
  sendMenuFollowUpEmail: sendEmail,
}));
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));

import {
  sendMenuFollowUpAction,
  sendMenuFollowUpBatchAction,
} from '../menuFollowUpActions';

const BIZ = '550e8400-e29b-41d4-a716-446655440000';
const BIZ2 = '550e8400-e29b-41d4-a716-4466554400aa';

/** A sendable target row from the RPC. */
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
  // A distinct admin per test so the module-level rate limiter doesn't leak.
  getCurrentUser.mockResolvedValue({
    id: `admin-${Math.random()}`,
    role: 'admin',
  });
  rpc.mockResolvedValue({ data: [target()], error: null });
  sendEmail.mockResolvedValue({ sent: true });
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
  it('sends and stamps a sendable shop', async () => {
    const res = await sendMenuFollowUpAction(BIZ);

    expect(res.outcome?.status).toBe('sent');
    expect(sendEmail).toHaveBeenCalledTimes(1);
    // The CTA is absolute and points at the owner's catalogue.
    const [, arg] = [null, sendEmail.mock.calls[0]![0]] as [
      null,
      { ctaUrl: string },
    ];
    expect(arg.ctaUrl).toBe(
      `https://ilokal.ph/business/${BIZ}/product-catalogues`,
    );
    // Stamped only after a real send.
    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({ menu_reminder_sent_at: expect.any(String) }),
    );
  });

  it('skips a shop that has since added a menu, without sending', async () => {
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
    rpc.mockResolvedValue({
      data: [target({ owner_email: '' })],
      error: null,
    });

    const res = await sendMenuFollowUpAction(BIZ);

    expect(res.outcome).toMatchObject({
      status: 'skipped',
      reason: 'NO_EMAIL',
    });
    expect(sendEmail).not.toHaveBeenCalled();
  });

  it('skips a shop reminded inside the cooldown (idempotency)', async () => {
    rpc.mockResolvedValue({
      data: [target({ menu_reminder_sent_at: new Date().toISOString() })],
      error: null,
    });

    const res = await sendMenuFollowUpAction(BIZ);

    expect(res.outcome).toMatchObject({
      status: 'skipped',
      reason: 'RECENTLY_SENT',
    });
    expect(sendEmail).not.toHaveBeenCalled();
  });

  it('does NOT stamp when the email failed to send', async () => {
    sendEmail.mockResolvedValue({ sent: false });

    const res = await sendMenuFollowUpAction(BIZ);

    expect(res.outcome).toMatchObject({
      status: 'failed',
      reason: 'SEND_FAILED',
    });
    expect(update).not.toHaveBeenCalled();
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

    // BIZ appears twice — deduped to one.
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
