// @vitest-environment happy-dom

/**
 * useAuth — client-side logout. react-dom/client + happy-dom (no
 * @testing-library). `signOutAction`, `next/navigation` and `sonner` are mocked.
 */

import * as React from 'react';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const { replace, refresh, signOutAction, toastError } = vi.hoisted(() => ({
  replace: vi.fn(),
  refresh: vi.fn(),
  signOutAction: vi.fn(),
  toastError: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace, refresh }),
}));
vi.mock('@/app/(auth)/actions', () => ({ signOutAction }));
vi.mock('sonner', () => ({ toast: { error: toastError } }));

import { useAuth } from '@/hooks/useAuth';
import { ROUTES } from '@/config/routeConfig';

let container: HTMLDivElement;
let root: Root;

function Harness({ path }: { path?: string }) {
  const { logout, isLoggingOut } = useAuth();
  return (
    <button onClick={() => logout(path)}>
      {isLoggingOut ? 'signing-out' : 'idle'}
    </button>
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  signOutAction.mockResolvedValue({ ok: true });
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

async function clickLogout() {
  const btn = container.querySelector('button')!;
  await act(async () => {
    btn.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await Promise.resolve();
  });
}

describe('useAuth.logout', () => {
  it('signs out, then replaces the current entry with the given path', async () => {
    act(() => root.render(<Harness path={ROUTES.AUTH.BUSINESS_LOGIN} />));
    await clickLogout();

    expect(signOutAction).toHaveBeenCalledTimes(1);
    expect(replace).toHaveBeenCalledWith(ROUTES.AUTH.BUSINESS_LOGIN);
  });

  it('routes admin logout to the admin login', async () => {
    act(() => root.render(<Harness path={ROUTES.AUTH.ADMIN_LOGIN} />));
    await clickLogout();
    expect(replace).toHaveBeenCalledWith(ROUTES.AUTH.ADMIN_LOGIN);
  });

  it('defaults to the generic login when no path is given', async () => {
    act(() => root.render(<Harness />));
    await clickLogout();
    expect(replace).toHaveBeenCalledWith(ROUTES.AUTH.LOGIN);
  });

  it('does NOT refresh the route it is leaving (would race the navigation)', async () => {
    act(() => root.render(<Harness path={ROUTES.AUTH.BUSINESS_LOGIN} />));
    await clickLogout();
    expect(refresh).not.toHaveBeenCalled();
  });

  it('stays put and warns when the session was NOT cleared', async () => {
    signOutAction.mockResolvedValueOnce({ ok: false });
    act(() => root.render(<Harness path={ROUTES.AUTH.BUSINESS_LOGIN} />));
    await clickLogout();

    expect(replace).not.toHaveBeenCalled();
    expect(toastError).toHaveBeenCalledTimes(1);
  });

  it('stays put when the sign-out request itself rejects', async () => {
    signOutAction.mockRejectedValueOnce(new Error('network'));
    act(() => root.render(<Harness path={ROUTES.AUTH.BUSINESS_LOGIN} />));
    await clickLogout();

    expect(replace).not.toHaveBeenCalled();
    expect(toastError).toHaveBeenCalledTimes(1);
  });

  it('releases the busy state after a failed sign-out so the user can retry', async () => {
    signOutAction.mockResolvedValueOnce({ ok: false });
    act(() => root.render(<Harness path={ROUTES.AUTH.LOGIN} />));
    await clickLogout();

    expect(container.querySelector('button')!.textContent).toBe('idle');
  });
});
