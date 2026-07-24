'use client';

import { useCallback, useState } from 'react';
import { useRouter } from 'next/navigation';
import { signOutAction } from '@/app/(auth)/actions';
import { ROUTES } from '@/config/routeConfig';

/**
 * useAuth — client-side logout.
 *
 * Sign-out is server work (`signOutAction`, redirect-less), but the navigation
 * is CLIENT-side (P10): `useRouter().push` fires reliably from an event handler
 * — unlike a Server-Action `redirect()` from an `onClick`, which left the user
 * on a stale page until a manual refresh. `router.refresh()` then drops the
 * cached authenticated RSC tree so protected content can't be Back-buttoned to.
 *
 * `redirectTo` lets each caller send the user to its role's login
 * (business → /login/business, admin → /login/admin).
 */
export function useAuth() {
  const router = useRouter();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const logout = useCallback(
    async (redirectTo: string = ROUTES.AUTH.LOGIN) => {
      setIsLoggingOut(true);
      try {
        await signOutAction();
      } catch (error) {
        // Fail-safe: navigate away even if the server sign-out errors.
        console.error('[useAuth] sign-out failed:', error);
      }
      router.push(redirectTo);
      router.refresh();
    },
    [router],
  );

  return { logout, isLoggingOut };
}
