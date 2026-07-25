// @vitest-environment happy-dom

/**
 * MFAEnrollDialog — auto-enroll on open, QR rendering, and the post-verify
 * refresh contract. react-dom/client + happy-dom (no @testing-library). Radix
 * renders into a portal, so assertions read `document.body`.
 */

import * as React from 'react';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const { mfa } = vi.hoisted(() => ({
  mfa: {
    enrollMFAAction: vi.fn(),
    verifyMFAEnrollmentAction: vi.fn(),
  },
}));

vi.mock('@/app/business/[businessId]/actions/mfaActions', () => mfa);

vi.mock('next/image', () => ({
  default: ({ src, alt }: { src: string; alt: string }) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={alt} />
  ),
}));

import { MFAEnrollDialog } from '../MFAEnrollDialog';

const QR = 'data:image/svg+xml;base64,PHN2Zy8+';

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  mfa.enrollMFAAction.mockReset().mockResolvedValue({
    factorId: 'factor-1',
    qrCode: QR,
    secret: 'S3CR3T',
  });
  mfa.verifyMFAEnrollmentAction.mockReset().mockResolvedValue({
    success: true,
  });
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

async function renderOpen(
  onSuccess: () => void | Promise<void> = vi.fn(),
  onOpenChange: (open: boolean) => void = vi.fn(),
) {
  await act(async () => {
    root.render(
      <MFAEnrollDialog
        open
        onOpenChange={onOpenChange}
        onSuccess={onSuccess}
      />,
    );
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
  await act(async () => {
    await Promise.resolve();
  });
}

function setValue(input: HTMLInputElement, value: string) {
  const setter = Object.getOwnPropertyDescriptor(
    window.HTMLInputElement.prototype,
    'value',
  )?.set;
  setter?.call(input, value);
  act(() => input.dispatchEvent(new Event('input', { bubbles: true })));
}

async function clickButton(label: string) {
  const button = Array.from(document.body.querySelectorAll('button')).find(
    (b) => b.textContent?.includes(label),
  )!;
  await act(async () => {
    button.click();
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
  // The verify path awaits the action, then the parent's refetch — each is its
  // own macrotask, so flush twice more.
  for (let i = 0; i < 2; i++) {
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
  }
}

describe('MFAEnrollDialog', () => {
  it('auto-enrolls on open and renders the QR as a data URL', async () => {
    await renderOpen();

    expect(mfa.enrollMFAAction).toHaveBeenCalledTimes(1);
    const img = document.body.querySelector('img');
    expect(img?.getAttribute('src')).toBe(QR);
    expect(document.body.textContent).toContain('S3CR3T');
  });

  it('never shows "Try again" before an attempt has failed', async () => {
    // The button used to paint on first commit, before the auto-enroll effect
    // flipped the loading flag.
    let resolveEnroll: (value: unknown) => void = () => {};
    mfa.enrollMFAAction.mockReturnValue(
      new Promise((resolve) => {
        resolveEnroll = resolve;
      }),
    );

    await act(async () => {
      root.render(
        <MFAEnrollDialog open onOpenChange={vi.fn()} onSuccess={vi.fn()} />,
      );
    });

    expect(document.body.textContent).toContain('Generating QR code');
    expect(document.body.textContent).not.toContain('Try again');

    await act(async () => {
      resolveEnroll({ factorId: 'f', qrCode: QR, secret: 'S' });
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
  });

  it('shows the error and a retry button when enrollment fails', async () => {
    mfa.enrollMFAAction.mockResolvedValue({
      factorId: '',
      qrCode: '',
      secret: '',
      error: 'Could not start two-factor setup.',
    });

    await renderOpen();

    expect(document.body.textContent).toContain(
      'Could not start two-factor setup.',
    );
    expect(document.body.textContent).toContain('Try again');
  });

  it('awaits onSuccess before closing', async () => {
    const order: string[] = [];
    const onSuccess = vi.fn(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
      order.push('refresh');
    });
    const onOpenChange = vi.fn((open: boolean) => {
      if (!open) order.push('close');
    });

    await renderOpen(onSuccess, onOpenChange);
    setValue(document.body.querySelector('#otp-code')!, '123456');
    await clickButton('Verify & Enable');

    expect(order).toEqual(['refresh', 'close']);
  });

  it('keeps the dialog open and explains a failed refresh', async () => {
    const onOpenChange = vi.fn();
    const onSuccess = vi.fn(async () => {
      throw new Error('list failed');
    });

    await renderOpen(onSuccess, onOpenChange);
    setValue(document.body.querySelector('#otp-code')!, '123456');
    await clickButton('Verify & Enable');

    expect(onOpenChange).not.toHaveBeenCalledWith(false);
    expect(document.body.textContent).toContain('could not be refreshed');
  });
});
