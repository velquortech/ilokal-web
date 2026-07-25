// @vitest-environment happy-dom

/**
 * ForgotPasswordForm — request flow + confirmation panel (resend/cooldown).
 * Driven with react-dom/client + happy-dom (no @testing-library; its peer
 * isn't installed, stack frozen). `motion/react` is mocked to a plain element
 * so animation props don't hit the DOM; `sonner` is mocked to spy on toasts.
 */

import * as React from 'react';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { toast } from 'sonner';

vi.mock('motion/react', () => ({
  motion: new Proxy(
    {},
    {
      get:
        () =>
        ({
          children,
          ...props
        }: React.PropsWithChildren<Record<string, unknown>>) => {
          const {
            initial: _i,
            animate: _a,
            transition: _t,
            exit: _e,
            ...rest
          } = props;
          void _i;
          void _a;
          void _t;
          void _e;
          return <div {...rest}>{children}</div>;
        },
    },
  ),
}));

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

import ForgotPasswordForm from '@/components/auth/ForgotPasswordForm';

let container: HTMLDivElement;
let root: Root;
const fetchMock = vi.fn();

beforeEach(() => {
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
  fetchMock.mockReset();
  vi.mocked(toast.success).mockReset();
  vi.mocked(toast.error).mockReset();
  vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

function render() {
  act(() => root.render(<ForgotPasswordForm />));
}

function setValue(input: HTMLInputElement, value: string) {
  const setter = Object.getOwnPropertyDescriptor(
    window.HTMLInputElement.prototype,
    'value',
  )?.set;
  setter?.call(input, value);
  act(() => input.dispatchEvent(new Event('input', { bubbles: true })));
}

async function submit() {
  const form = container.querySelector('form')!;
  await act(async () => {
    form.dispatchEvent(
      new Event('submit', { bubbles: true, cancelable: true }),
    );
    await Promise.resolve();
  });
}

function okResponse() {
  return {
    ok: true,
    status: 200,
    json: async () => ({ success: true, data: {} }),
  };
}

/** Submit a valid email so the confirmation panel is showing. */
async function reachConfirmation(email = 'user@example.com') {
  fetchMock.mockResolvedValue(okResponse());
  render();
  setValue(container.querySelector('#email')!, email);
  await submit();
  expect(container.textContent).toContain('Check your email');
}

function resendButton(): HTMLButtonElement {
  const btn = [...container.querySelectorAll('button')].find((b) =>
    b.textContent?.includes('Resend'),
  );
  expect(btn, 'resend button should be rendered').toBeTruthy();
  return btn as HTMLButtonElement;
}

/** Tick the 1s cooldown timer `seconds` times (each tick needs a flush). */
async function advanceCooldown(seconds: number) {
  for (let i = 0; i < seconds; i++) {
    await act(async () => {
      vi.advanceTimersByTime(1000);
      await Promise.resolve();
    });
  }
}

describe('ForgotPasswordForm — request flow', () => {
  it('posts the email and shows the generic confirmation panel', async () => {
    fetchMock.mockResolvedValue(okResponse());
    render();

    setValue(container.querySelector('#email')!, 'user@example.com');
    await submit();

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/auth/reset-password',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ email: 'user@example.com' }),
      }),
    );
    expect(container.textContent).toContain('Check your email');
    expect(container.textContent).toContain('user@example.com');
  });

  it('does not submit an invalid email', async () => {
    render();
    setValue(container.querySelector('#email')!, 'not-an-email');
    await submit();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('shows a generic error when the request fails', async () => {
    fetchMock.mockRejectedValue(new Error('network'));
    render();
    setValue(container.querySelector('#email')!, 'user@example.com');
    await submit();
    expect(container.textContent).toContain('could not process');
    expect(container.textContent).not.toContain('Check your email');
  });
});

describe('ForgotPasswordForm — confirmation panel', () => {
  it('starts the resend cooldown disabled, then enables after 60s', async () => {
    vi.useFakeTimers();
    await reachConfirmation();

    const btn = resendButton();
    expect(btn.disabled).toBe(true);
    expect(btn.textContent).toContain('Resend email in 60s');

    await advanceCooldown(59);
    expect(resendButton().disabled).toBe(true);
    expect(resendButton().textContent).toContain('Resend email in 1s');

    await advanceCooldown(1);
    expect(resendButton().disabled).toBe(false);
    expect(resendButton().textContent).toContain('Resend email');
    expect(resendButton().textContent).not.toContain('in ');
  });

  it('resend re-posts the same email, toasts success, and restarts the cooldown', async () => {
    vi.useFakeTimers();
    await reachConfirmation('owner@shop.ph');
    await advanceCooldown(60);
    fetchMock.mockClear();

    await act(async () => {
      resendButton().click();
      await Promise.resolve();
    });

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/auth/reset-password',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ email: 'owner@shop.ph' }),
      }),
    );
    expect(toast.success).toHaveBeenCalledWith(
      expect.stringContaining('sent again'),
      { id: 'resend-reset-link' },
    );
    expect(resendButton().disabled).toBe(true);
    expect(resendButton().textContent).toContain('Resend email in 60s');
  });

  it('resend failure toasts an error and keeps the panel (no enumeration leak)', async () => {
    vi.useFakeTimers();
    await reachConfirmation();
    await advanceCooldown(60);
    fetchMock.mockRejectedValue(new Error('network'));

    await act(async () => {
      resendButton().click();
      await Promise.resolve();
    });

    expect(toast.error).toHaveBeenCalledWith(
      expect.stringContaining('resend'),
      {
        id: 'resend-reset-link',
      },
    );
    expect(container.textContent).toContain('Check your email');
    // no cooldown restart on failure — user can retry immediately
    expect(resendButton().disabled).toBe(false);
  });

  it('"Use a different email" returns to the request form', async () => {
    await reachConfirmation();

    const back = [...container.querySelectorAll('button')].find((b) =>
      b.textContent?.includes('Use a different email'),
    )!;
    await act(async () => {
      back.click();
      await Promise.resolve();
    });

    expect(container.querySelector('#email')).toBeTruthy();
    expect(container.textContent).toContain('Forgot your password?');
    expect(container.textContent).not.toContain('Check your email');
  });

  it('scopes role="status" to the static copy, not the countdown', async () => {
    await reachConfirmation();

    const status = container.querySelector('[role="status"]')!;
    expect(status.textContent).toContain('Check your email');
    expect(status.textContent).not.toContain('Resend email');
  });
});
