// @vitest-environment happy-dom

/**
 * SignInForm — the unified /sign-in door. react-dom/client + happy-dom (no
 * @testing-library). The (auth) actions barrel, `next/navigation`, and
 * `motion/react` are mocked; `safeNext` and the Zod login schema run real.
 *
 * Covers the routing matrix (role × ?next=), the typed rate-limit result, and
 * the MFA elevation step.
 */

import * as React from 'react';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const { replaceMock, refreshMock, actions, params } = vi.hoisted(() => ({
  replaceMock: vi.fn(),
  refreshMock: vi.fn(),
  actions: {
    signInAction: vi.fn(),
    redirectByRole: vi.fn(),
    signOutAction: vi.fn(),
    checkMFARequiredAction: vi.fn(),
    verifyMFALoginAction: vi.fn(),
  },
  params: { next: null as string | null, mfa: null as string | null },
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

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: replaceMock, refresh: refreshMock }),
  useSearchParams: () => ({
    get: (key: string) =>
      key === 'next' ? params.next : key === 'mfa' ? params.mfa : null,
  }),
}));

vi.mock('@/app/(auth)/actions', () => actions);

import SignInForm from '@/components/auth/SignInForm';

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  params.next = null;
  params.mfa = null;
  actions.signOutAction.mockReset().mockResolvedValue({
    ok: true,
    revoked: true,
  });
  replaceMock.mockReset();
  refreshMock.mockReset();
  actions.signInAction.mockReset();
  actions.redirectByRole.mockReset().mockResolvedValue(undefined);
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
  act(() => root.render(<SignInForm />));
}

function setValue(input: HTMLInputElement, value: string) {
  const setter = Object.getOwnPropertyDescriptor(
    window.HTMLInputElement.prototype,
    'value',
  )?.set;
  setter?.call(input, value);
  act(() => input.dispatchEvent(new Event('input', { bubbles: true })));
}

/** Flush RHF validation + the transition's async chain. */
async function flush() {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
    await Promise.resolve();
  });
}

async function submitCredentials(
  email = 'user@example.com',
  password = 'Password1',
) {
  setValue(container.querySelector('#email')!, email);
  setValue(container.querySelector('#password')!, password);
  const form = container.querySelector('form')!;
  await act(async () => {
    form.dispatchEvent(
      new Event('submit', { bubbles: true, cancelable: true }),
    );
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
  await flush();
}

function signInResolves(role: string, businessId: string | null = null) {
  actions.signInAction.mockResolvedValue({
    user: { id: 'u1', role },
    businessId,
    message: 'Logged in successfully',
  });
}

describe('SignInForm', () => {
  it('sends an app_user back to a validated ?next= deep link', async () => {
    params.next = '/explore/some-business';
    signInResolves('app_user');
    render();
    await submitCredentials();

    expect(replaceMock).toHaveBeenCalledWith('/explore/some-business');
    expect(refreshMock).toHaveBeenCalled();
    expect(actions.redirectByRole).not.toHaveBeenCalled();
  });

  it('routes an app_user without ?next= by role', async () => {
    signInResolves('app_user');
    render();
    await submitCredentials();

    expect(actions.redirectByRole).toHaveBeenCalledWith('app_user', null);
    expect(replaceMock).not.toHaveBeenCalled();
  });

  it('routes a business_owner by role with its businessId — ?next= is customer-only', async () => {
    params.next = '/explore/some-business';
    signInResolves('business_owner', 'biz-1');
    render();
    await submitCredentials();

    expect(actions.redirectByRole).toHaveBeenCalledWith(
      'business_owner',
      'biz-1',
    );
    expect(replaceMock).not.toHaveBeenCalled();
  });

  it('routes an admin by role too — no wrong-portal rejection', async () => {
    signInResolves('admin');
    render();
    await submitCredentials();

    expect(actions.redirectByRole).toHaveBeenCalledWith('admin', null);
  });

  it('renders the typed rate-limit message without navigating', async () => {
    actions.signInAction.mockResolvedValue({
      rateLimited: true,
      message: 'Too many attempts. Please try again in a few minutes.',
    });
    render();
    await submitCredentials();

    expect(container.textContent).toContain('Too many attempts');
    expect(actions.redirectByRole).not.toHaveBeenCalled();
    expect(replaceMock).not.toHaveBeenCalled();
    // MFA check must not run for a rate-limited attempt.
    expect(actions.checkMFARequiredAction).not.toHaveBeenCalled();
  });

  it('shows the MFA step when a verified factor is enrolled, then finishes sign-in on verify', async () => {
    signInResolves('business_owner', 'biz-7');
    actions.checkMFARequiredAction.mockResolvedValue({
      required: true,
      factorId: 'factor-1',
    });
    actions.verifyMFALoginAction.mockResolvedValue({ success: true });
    render();
    await submitCredentials();

    expect(container.textContent).toContain('Two-Factor Verification');
    expect(actions.redirectByRole).not.toHaveBeenCalled();

    setValue(container.querySelector('#mfa-code')!, '123456');
    const verifyButton = Array.from(container.querySelectorAll('button')).find(
      (b) => b.textContent?.includes('Verify & Sign In'),
    )!;
    await act(async () => {
      verifyButton.click();
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
    await flush();

    expect(actions.verifyMFALoginAction).toHaveBeenCalledWith(
      'factor-1',
      '123456',
    );
    expect(actions.redirectByRole).toHaveBeenCalledWith(
      'business_owner',
      'biz-7',
    );
  });

  it('keeps the MFA step with an inline error on a wrong code', async () => {
    signInResolves('business_owner', 'biz-7');
    actions.checkMFARequiredAction.mockResolvedValue({
      required: true,
      factorId: 'factor-1',
    });
    actions.verifyMFALoginAction.mockResolvedValue({
      success: false,
      error: 'Invalid code',
    });
    render();
    await submitCredentials();

    setValue(container.querySelector('#mfa-code')!, '000000');
    const verifyButton = Array.from(container.querySelectorAll('button')).find(
      (b) => b.textContent?.includes('Verify & Sign In'),
    )!;
    await act(async () => {
      verifyButton.click();
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
    await flush();

    expect(container.textContent).toContain('Invalid code');
    expect(container.textContent).toContain('Two-Factor Verification');
    expect(actions.redirectByRole).not.toHaveBeenCalled();
  });

  it('signs out the AAL1 session when the MFA step is abandoned', async () => {
    // signInAction sets the session before the code step, so leaving it must
    // not strand a live half-authenticated cookie.
    signInResolves('business_owner', 'biz-7');
    actions.checkMFARequiredAction.mockResolvedValue({
      required: true,
      factorId: 'factor-1',
    });
    render();
    await submitCredentials();

    const backButton = Array.from(container.querySelectorAll('button')).find(
      (b) => b.textContent?.includes('Back to sign in'),
    )!;
    await act(async () => {
      backButton.click();
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
    await flush();

    expect(actions.signOutAction).toHaveBeenCalled();
    expect(container.textContent).toContain('Welcome back');
    expect(actions.redirectByRole).not.toHaveBeenCalled();
  });

  it('explains an incomplete MFA sign-in when the proxy sends ?mfa=required', async () => {
    params.mfa = 'required';
    render();

    expect(container.textContent).toContain(
      "Two-factor verification wasn't completed",
    );
  });
});
