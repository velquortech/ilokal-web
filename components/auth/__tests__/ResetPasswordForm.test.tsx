// @vitest-environment happy-dom

/**
 * ResetPasswordForm — confirm flow. react-dom/client + happy-dom (no
 * @testing-library). `motion/react`, `next/navigation`, and `sonner` are mocked.
 */

import * as React from 'react';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const { pushMock, toastSuccess, state } = vi.hoisted(() => ({
  pushMock: vi.fn(),
  toastSuccess: vi.fn(),
  state: { tokenHash: 'HASH123' as string | null },
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
  useRouter: () => ({ push: pushMock }),
  useSearchParams: () => ({ get: () => state.tokenHash }),
}));

vi.mock('sonner', () => ({
  toast: { success: toastSuccess },
}));

import ResetPasswordForm from '@/components/auth/ResetPasswordForm';

let container: HTMLDivElement;
let root: Root;
const fetchMock = vi.fn();

beforeEach(() => {
  state.tokenHash = 'HASH123';
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
  fetchMock.mockReset();
  pushMock.mockReset();
  toastSuccess.mockReset();
  vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
  vi.unstubAllGlobals();
});

function render() {
  act(() => root.render(<ResetPasswordForm />));
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

describe('ResetPasswordForm', () => {
  it('shows the invalid-link state when token_hash is missing', () => {
    state.tokenHash = null;
    render();
    expect(container.textContent).toContain('invalid or incomplete');
    expect(container.querySelector('form')).toBeNull();
  });

  it('submits token_hash + password and redirects on success', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ success: true, data: {} }),
    });
    render();

    setValue(container.querySelector('#password')!, 'NewPass1');
    setValue(container.querySelector('#confirmPassword')!, 'NewPass1');
    await submit();

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/auth/reset-password',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ token_hash: 'HASH123', password: 'NewPass1' }),
      }),
    );
    expect(toastSuccess).toHaveBeenCalled();
    expect(pushMock).toHaveBeenCalledWith('/login/business?reset=1');
  });

  it('blocks submit when the passwords do not match', async () => {
    render();
    setValue(container.querySelector('#password')!, 'NewPass1');
    setValue(container.querySelector('#confirmPassword')!, 'Different1');
    await submit();
    expect(fetchMock).not.toHaveBeenCalled();
    expect(container.textContent).toContain('do not match');
  });

  it('surfaces the server error message on failure', async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      status: 400,
      json: async () => ({
        success: false,
        error: {
          code: 'INVALID_TOKEN',
          message: 'This reset link is invalid.',
        },
      }),
    });
    render();
    setValue(container.querySelector('#password')!, 'NewPass1');
    setValue(container.querySelector('#confirmPassword')!, 'NewPass1');
    await submit();

    expect(pushMock).not.toHaveBeenCalled();
    expect(container.textContent).toContain('This reset link is invalid.');
  });

  it('shows the 2FA code step on mfaRequired, then submits password + code', async () => {
    // Step 1 → mfaRequired; Step 2 → success.
    fetchMock
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ success: true, data: { mfaRequired: true } }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ success: true, data: {} }),
      });
    render();

    setValue(container.querySelector('#password')!, 'NewPass1');
    setValue(container.querySelector('#confirmPassword')!, 'NewPass1');
    await submit();

    // The password step gave way to the 2FA code step.
    expect(container.textContent).toContain('Two-factor authentication');
    const codeInput = container.querySelector<HTMLInputElement>('#mfa-code');
    expect(codeInput).not.toBeNull();
    expect(pushMock).not.toHaveBeenCalled();

    setValue(codeInput!, '123456');
    await submit();

    // Step 2 posted password + code (no token_hash).
    expect(fetchMock).toHaveBeenLastCalledWith(
      '/api/auth/reset-password',
      expect.objectContaining({
        body: JSON.stringify({ password: 'NewPass1', code: '123456' }),
      }),
    );
    expect(toastSuccess).toHaveBeenCalled();
    expect(pushMock).toHaveBeenCalledWith('/login/business?reset=1');
  });

  it('keeps the 2FA step and shows an error on a wrong code', async () => {
    fetchMock
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ success: true, data: { mfaRequired: true } }),
      })
      .mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({
          success: false,
          error: { code: 'INVALID_CODE', message: 'That code is incorrect.' },
        }),
      });
    render();

    setValue(container.querySelector('#password')!, 'NewPass1');
    setValue(container.querySelector('#confirmPassword')!, 'NewPass1');
    await submit();
    setValue(container.querySelector('#mfa-code')!, '000000');
    await submit();

    expect(pushMock).not.toHaveBeenCalled();
    expect(container.textContent).toContain('That code is incorrect.');
    // still on the code step for a retry
    expect(container.querySelector('#mfa-code')).not.toBeNull();
  });
});
