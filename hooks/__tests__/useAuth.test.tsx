// @vitest-environment happy-dom

/**
 * useAuth — client-side logout. react-dom/client + happy-dom (no
 * @testing-library). `signOutAction` and `next/navigation` are mocked.
 */

import * as React from 'react';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const { push, refresh, signOutAction } = vi.hoisted(() => ({
  push: vi.fn(),
  refresh: vi.fn(),
  signOutAction: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push, refresh }),
}));
vi.mock('@/app/(auth)/actions', () => ({ signOutAction }));

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
  signOutAction.mockResolvedValue(undefined);
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
  it('signs out, then navigates to the given path and refreshes', async () => {
    act(() => root.render(<Harness path={ROUTES.AUTH.BUSINESS_LOGIN} />));
    await clickLogout();

    expect(signOutAction).toHaveBeenCalledTimes(1);
    expect(push).toHaveBeenCalledWith(ROUTES.AUTH.BUSINESS_LOGIN);
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it('routes admin logout to the admin login', async () => {
    act(() => root.render(<Harness path={ROUTES.AUTH.ADMIN_LOGIN} />));
    await clickLogout();
    expect(push).toHaveBeenCalledWith(ROUTES.AUTH.ADMIN_LOGIN);
  });

  it('defaults to the generic login when no path is given', async () => {
    act(() => root.render(<Harness />));
    await clickLogout();
    expect(push).toHaveBeenCalledWith(ROUTES.AUTH.LOGIN);
  });

  it('navigates even if sign-out fails (fail-safe)', async () => {
    signOutAction.mockRejectedValueOnce(new Error('network'));
    act(() => root.render(<Harness path={ROUTES.AUTH.BUSINESS_LOGIN} />));
    await clickLogout();

    expect(push).toHaveBeenCalledWith(ROUTES.AUTH.BUSINESS_LOGIN);
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it('flips isLoggingOut while signing out', async () => {
    act(() => root.render(<Harness path={ROUTES.AUTH.LOGIN} />));
    await clickLogout();
    // stays true through navigation (component would unmount on a real redirect)
    expect(container.querySelector('button')!.textContent).toBe('signing-out');
  });
});
