// @vitest-environment happy-dom

/**
 * SendReminderButton — maps each action outcome to the right toast. The
 * skip-reason copy is real logic (an owner should read why nothing was sent),
 * so it is exercised rather than asserted as source text.
 */

import * as React from 'react';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const { send, toast, refresh } = vi.hoisted(() => ({
  send: vi.fn(),
  toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() },
  refresh: vi.fn(),
}));

vi.mock('../../../actions/menuFollowUpActions', () => ({
  sendMenuFollowUpAction: send,
}));
vi.mock('sonner', () => ({ toast }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh }) }));

import { SendReminderButton } from '../send-reminder-button';

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  vi.clearAllMocks();
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
});
afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

async function clickSend() {
  act(() => root.render(<SendReminderButton businessId="biz-1" />));
  await act(async () => {
    container
      .querySelector('button')!
      .dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await Promise.resolve();
    await Promise.resolve();
  });
}

describe('SendReminderButton', () => {
  it('toasts success and calls the action with the id on a sent outcome', async () => {
    send.mockResolvedValue({ ok: true, outcome: { status: 'sent' } });
    await clickSend();

    expect(send).toHaveBeenCalledWith('biz-1');
    expect(toast.success).toHaveBeenCalledWith('Reminder sent.');
  });

  it('explains a skip rather than claiming success', async () => {
    send.mockResolvedValue({
      ok: true,
      outcome: { status: 'skipped', reason: 'ALREADY_HAS_MENU' },
    });
    await clickSend();

    expect(toast.success).not.toHaveBeenCalled();
    expect(toast.info).toHaveBeenCalledWith(
      expect.stringContaining('added a menu'),
    );
  });

  it('surfaces a send failure', async () => {
    send.mockResolvedValue({ ok: true, outcome: { status: 'failed' } });
    await clickSend();

    expect(toast.error).toHaveBeenCalled();
  });

  it('surfaces an authorization / validation error', async () => {
    send.mockResolvedValue({ ok: false, error: 'Unauthorized' });
    await clickSend();

    expect(toast.error).toHaveBeenCalledWith('Unauthorized');
  });
});
