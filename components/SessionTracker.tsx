'use client';

import { useEffect } from 'react';
import { verifySessionAction } from '@/app/(auth)/actions';

/**
 * SessionTracker Component
 *
 * Tracks user session and stores expiration time in localStorage.
 * This allows useSessionMonitor hook to check session expiration
 * without needing access to user data from Zustand (which no longer exists).
 *
 * How it works:
 * 1. On mount, calls verifySessionAction to check if user is logged in
 * 2. If user exists, stores session expiration time in localStorage
 * 3. Session expiration is set to 30 minutes from current time
 * 4. useSessionMonitor reads this value and uses it to warn/logout
 *
 * localStorage key: 'sessionExpiration' (numeric timestamp in milliseconds)
 */
export function SessionTracker() {
  useEffect(() => {
    async function initializeSession() {
      try {
        const result = await verifySessionAction();

        if (result?.user) {
          // Session is valid, set expiration time
          // Default timeout is 30 minutes (same as getSessionTimeout in config)
          const expirationTime = Date.now() + 30 * 60 * 1000;
          localStorage.setItem('sessionExpiration', expirationTime.toString());
        } else {
          // No valid session, clear expiration
          localStorage.removeItem('sessionExpiration');
        }
      } catch {
        // Error during verification, clear expiration
        localStorage.removeItem('sessionExpiration');
      }
    }

    initializeSession();
  }, []);

  // This component doesn't render anything, just manages session state
  return null;
}
