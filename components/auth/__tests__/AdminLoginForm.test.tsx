// @vitest-environment happy-dom

/**
 * AdminLoginForm — the /sign-in/admin door. react-dom/client + happy-dom (no
 * @testing-library), same harness as SignInForm.test.tsx.
 *
 * The MFA step here is NOT cosmetic: the proxy bounces an AAL1 session off
 * every protected page, so without elevation an MFA-enrolled admin could never
 * reach /admin from this door.
 */

import * as React from 'react';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const { actions } = vi.hoisted(() => ({
  actions: {
    loginAsAdmin: vi.fn(),
    redirectByRole: vi.fn(),
    signOutAction: vi.fn(),
    checkMFARequiredAction: vi.fn(),
    verifyMFALoginAction: vi.fn(),
  },
}));

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

vi.mock('@/app/(auth)/actions', () => actions);

import AdminLoginForm from '@/components/auth/AdminLoginForm';

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  actions.loginAsAdmin.mockReset().mockResolvedValue({
    user: { id: 'admin-1', role: 'admin' },
    message: 'Logged in successfully',
  });
  actions.redirectByRole.mockReset().mockResolvedValue(undefined);
  actions.signOutAction.mockReset().mockResolvedValue({
    ok: true,
    revoked: true,
  });
  actions.checkMFARequiredAction
    .mockReset()
    .mockResolvedValue({ required: false, factorId: null });
  actions.verifyMFALoginAction.mockReset();
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

function render() {
  act(() => root.render(<AdminLoginForm />));
}

function setValue(input: HTMLInputElement, value: string) {
  const setter = Object.getOwnPropertyDescriptor(
    window.HTMLInputElement.prototype,
    'value',
  )?.set;
  setter?.call(input, value);
  act(() => input.dispatchEvent(new Event('input', { bubbles: true })));
}

async function flush() {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
    await Promise.resolve();
  });
}

async function submitCredentials() {
  setValue(container.querySelector('#email')!, 'admin@example.com');
  setValue(container.querySelector('#password')!, 'Password1');
  const form = container.querySelector('form')!;
  await act(async () => {
    form.dispatchEvent(
      new Event('submit', { bubbles: true, cancelable: true }),
    );
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
  await flush();
}

function clickButton(label: string) {
  const button = Array.from(container.querySelectorAll('button')).find((b) =>
    b.textContent?.includes(label),
  )!;
  return act(async () => {
    button.click();
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
}

describe('AdminLoginForm', () => {
  it('routes straight to /admin when no factor is enrolled', async () => {
    render();
    await submitCredentials();

    expect(actions.checkMFARequiredAction).toHaveBeenCalled();
    expect(actions.redirectByRole).toHaveBeenCalledWith('admin');
  });

  it('shows the MFA step for an enrolled admin, then routes on verify', async () => {
    actions.checkMFARequiredAction.mockResolvedValue({
      required: true,
      factorId: 'factor-9',
    });
    actions.verifyMFALoginAction.mockResolvedValue({ success: true });
    render();
    await submitCredentials();

    expect(container.textContent).toContain('Two-Factor Verification');
    expect(actions.redirectByRole).not.toHaveBeenCalled();

    setValue(container.querySelector('#admin-mfa-code')!, '654321');
    await clickButton('Verify & Sign In');
    await flush();

    expect(actions.verifyMFALoginAction).toHaveBeenCalledWith(
      'factor-9',
      '654321',
    );
    expect(actions.redirectByRole).toHaveBeenCalledWith('admin');
  });

  it('keeps the step with an inline error on a wrong code', async () => {
    actions.checkMFARequiredAction.mockResolvedValue({
      required: true,
      factorId: 'factor-9',
    });
    actions.verifyMFALoginAction.mockResolvedValue({
      success: false,
      error: 'Invalid code',
    });
    render();
    await submitCredentials();

    setValue(container.querySelector('#admin-mfa-code')!, '000000');
    await clickButton('Verify & Sign In');
    await flush();

    expect(container.textContent).toContain('Invalid code');
    expect(actions.redirectByRole).not.toHaveBeenCalled();
  });

  it('signs out the AAL1 session when the step is abandoned', async () => {
    actions.checkMFARequiredAction.mockResolvedValue({
      required: true,
      factorId: 'factor-9',
    });
    render();
    await submitCredentials();

    await clickButton('Back to sign in');
    await flush();

    expect(actions.signOutAction).toHaveBeenCalled();
    expect(container.textContent).toContain('Admin Portal');
    expect(actions.redirectByRole).not.toHaveBeenCalled();
  });
});
