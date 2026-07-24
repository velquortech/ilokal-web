// @vitest-environment happy-dom

/**
 * ForgotPasswordForm — request flow. Driven with react-dom/client + happy-dom
 * (no @testing-library; its peer isn't installed, stack frozen). `motion/react`
 * is mocked to a plain element so animation props don't hit the DOM.
 */

import * as React from 'react';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

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

import ForgotPasswordForm from '@/components/auth/ForgotPasswordForm';

let container: HTMLDivElement;
let root: Root;
const fetchMock = vi.fn();

beforeEach(() => {
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
  fetchMock.mockReset();
  vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
  vi.unstubAllGlobals();
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

describe('ForgotPasswordForm', () => {
  it('posts the email and shows the generic confirmation panel', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ success: true, data: {} }),
    });
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
