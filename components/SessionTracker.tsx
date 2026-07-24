'use client';

import { useEffect } from 'react';
import { verifySessionAction } from '@/app/(auth)/actions';
import { useSessionMonitorContext } from '@/providers/SessionMonitorProvider';

/**
 * SessionTracker Component
 *
 * Initializes session monitoring on app mount.
 * Triggers useSessionMonitor hook to start periodic session verification
 * and activity-based session refresh.
 *
 * Security Model:
 * - Verifies HTTP-only auth cookie with server
 * - Middleware already checks auth on route changes
 * - useSessionMonitor handles client-side expiration logic
 * - No sensitive data stored on client (non-httpOnly session cookie removed)
 */
export function SessionTracker() {
  // Subscribe to the provider's monitor — do NOT call `useSessionMonitor()`
  // here, that would start a second poller alongside the provider's.
  useSessionMonitorContext();

  useEffect(() => {
    async function initializeSession() {
      try {
        const result = await verifySessionAction();
        // Session verification happens in useSessionMonitor hook instead
        // This just ensures server has verified user on initial load
        if (!result?.user) {
          // Session initialization complete
        }
      } catch (error) {
        console.error('[SessionTracker] Session initialization error:', error);
      }
    }

    initializeSession();
  }, []);

  // This component doesn't render anything, just initializes session monitoring
  return null;
}
