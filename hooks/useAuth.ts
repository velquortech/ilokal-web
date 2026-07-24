'use client';

import { useCallback, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { signOutAction } from '@/app/(auth)/actions';
import { ROUTES } from '@/config/routeConfig';

/**
 * useAuth — client-side logout.
 *
 * Sign-out is server work (`signOutAction`, redirect-less), but the navigation
 * is CLIENT-side: `useRouter().replace` fires reliably from an event handler —
 * unlike a Server-Action `redirect()` from an `onClick`, which left the user on
 * a stale page until a manual refresh. `replace` (not `push`) so the protected
 * URL leaves the history stack and Back cannot return to it.
 *
 * The action reports whether the session was actually cleared; a failed
 * sign-out keeps the user where they are with a retry toast rather than showing
 * them a login page while their session is still live.
 *
 * `redirectTo` lets each caller send the user to its role's login
 * (business → /login/business, admin → /login/admin).
 */
export function useAuth() {
  const router = useRouter();
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [isNavigating, startTransition] = useTransition();

  const logout = useCallback(
    async (redirectTo: string = ROUTES.AUTH.LOGIN) => {
      setIsSigningOut(true);

      let ok = false;
      try {
        const result = await signOutAction();
        ok = result?.ok === true;
      } catch (error) {
        // The action is written not to throw; a rejection here means the
        // Server Action request itself failed (offline, 500), so the session
        // is untouched and we must not navigate.
        console.error('[useAuth] sign-out failed:', error);
      } finally {
        // Always release the flag — the busy state must never stick if the
        // component survives (failed sign-out, navigation blocked).
        setIsSigningOut(false);
      }

      if (!ok) {
        toast.error('Could not sign you out. Please try again.');
        return;
      }

      // No `router.refresh()` here: refreshing fires against the route the
      // client router still considers current (the authed page), whose layout
      // answers with its own redirect and can race this navigation. Both
      // dashboard layouts are cookie-dynamic, so their RSC payloads are not
      // reused after the session cookie is gone.
      startTransition(() => {
        router.replace(redirectTo);
      });
    },
    [router],
  );

  return { logout, isLoggingOut: isSigningOut || isNavigating };
}
