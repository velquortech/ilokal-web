'use client';

import { useEffect } from 'react';
import {
  verifySessionAction,
  setSessionExpirationCookie,
  clearSessionExpirationCookie,
} from '@/app/(auth)/actions';

/**
 * SessionTracker Component
 *
 * Tracks user session and stores expiration time in an app cookie.
 * This allows useSessionMonitor hook to check session expiration
 * without needing access to user data from Zustand.
 *
 * How it works:
 * 1. On mount, calls verifySessionAction to check if user is logged in
 * 2. If user exists, stores session expiration time in app cookie (non-httpOnly)
 * 3. Session expiration is set to 30 minutes from current time
 * 4. useSessionMonitor reads this via getSessionExpirationCookie
 * 5. On logout, clearSessionExpirationCookie removes it
 *
 * Benefits:
 * - Secure: Managed by Next.js, not vulnerable like localStorage
 * - Server-managed: Can be set/cleared from Server Actions
 * - Standard: Uses HTTP cookie mechanism
 * - Automatic cleanup: Can set maxAge for automatic expiration
 */
export function SessionTracker() {
  useEffect(() => {
    async function initializeSession() {
      try {
        const result = await verifySessionAction();

        if (result?.user) {
          // Session is valid, set expiration time via server action
          // Default timeout is 30 minutes (same as getSessionTimeout in config)
          const expirationTime = Date.now() + 30 * 60 * 1000;
          await setSessionExpirationCookie(expirationTime);
        } else {
          // No valid session, clear expiration cookie
          await clearSessionExpirationCookie();
        }
      } catch {
        // Error during verification, clear expiration
        await clearSessionExpirationCookie();
      }
    }

    initializeSession();
  }, []);

  // This component doesn't render anything, just manages session state
  return null;
}
