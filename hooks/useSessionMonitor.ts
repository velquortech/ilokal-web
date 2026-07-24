'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { verifySessionAction } from '@/app/(auth)/actions';
import { useAuth } from '@/hooks/useAuth';
import { ROUTES } from '@/config/routeConfig';
import {
  SESSION_CHECK_INTERVAL,
  ACTIVITY_DEBOUNCE_DELAY,
  isSessionExpired,
  isSessionExpiring,
  getTimeRemaining,
  calculateSessionExpiration,
  getSessionTimeout,
} from '@/config/sessionConfig';

interface SessionWarning {
  isExpiring: boolean;
  timeRemaining: number; // in minutes
}

/**
 * Hook to monitor session expiration
 *
 * ⚠️ NOT MOUNTED — its only consumers (`AuthProvider`, `SessionTracker`,
 * `SessionWarningDialog`) have zero render sites. See the note in
 * `providers/AuthProvider.tsx`.
 *
 * Features:
 * - Periodically verifies session is still valid with server
 * - Detects expired sessions and logs out automatically
 * - Warns when session is about to expire (within 5 minutes)
 * - Automatically refreshes session on user activity (debounced)
 * - Activity detection includes: mouse, keyboard, scroll, touch
 * - Optimized event listeners with proper cleanup
 *
 * Security:
 * - No sensitive data stored on client
 * - Session expiration calculated locally based on timeout duration
 * - Actual session managed by HTTP-only cookie on server
 * - Middleware provides defense-in-depth on route changes
 *
 * Usage:
 * ```tsx
 * const { isExpiring, timeRemaining } = useSessionMonitor();
 * if (isExpiring) {
 *   return <SessionWarningDialog timeRemaining={timeRemaining} />;
 * }
 * ```
 */
export function useSessionMonitor() {
  // Client-side logout: a Server-Action `redirect()` awaited from an effect or
  // event handler clears the cookie without navigating (the bug this replaces).
  // Re-exported below so consumers share THIS instance's busy state instead of
  // instantiating a second, independent `useAuth()`.
  const { logout, isLoggingOut } = useAuth();
  const [sessionWarning, setSessionWarning] = useState<SessionWarning>({
    isExpiring: false,
    timeRemaining: 0,
  });
  const [sessionExpiration, setSessionExpiration] = useState<number | null>(
    null,
  );
  const expirationRef = useRef<number | null>(null);
  const lastRefreshRef = useRef<number>(0);

  // Initialize session on mount
  useEffect(() => {
    async function initializeExpiration() {
      try {
        const result = await verifySessionAction();
        if (result?.user) {
          // Get timeout for user's role (default to app_user if role not available)
          const timeoutMinutes = getSessionTimeout(result.user.role);
          const expirationTime = calculateSessionExpiration(timeoutMinutes);
          expirationRef.current = expirationTime;
          setSessionExpiration(expirationTime);
        }
      } catch (error) {
        console.error('[useSessionMonitor] Initialization error:', error);
      }
    }

    initializeExpiration();
  }, []);

  /**
   * Refresh function to reset session on user activity
   * Debounced to prevent excessive calls during rapid interactions
   * Recalculates expiration based on role-specific timeout
   */
  const refreshSession = useCallback(async () => {
    const now = Date.now();

    // Skip refresh if called within debounce window
    if (now - lastRefreshRef.current < ACTIVITY_DEBOUNCE_DELAY) {
      return;
    }

    lastRefreshRef.current = now;

    try {
      // Verify session with server to get updated user info
      const result = await verifySessionAction();

      if (result?.user) {
        // Calculate new expiration based on role-specific timeout
        const timeoutMinutes = getSessionTimeout(result.user.role);
        const newExpirationTime = calculateSessionExpiration(timeoutMinutes);

        // Update local state immediately for responsiveness
        expirationRef.current = newExpirationTime;
        setSessionExpiration(newExpirationTime);
        setSessionWarning({
          isExpiring: false,
          timeRemaining: timeoutMinutes,
        });
      } else {
        // Session already known-invalid — force the navigation. Staying put
        // would park the user on a protected page with a dead session and
        // re-fire the retry toast on every tick.
        await logout(ROUTES.AUTH.LOGIN, { force: true });
      }
    } catch (error) {
      console.error('[useSessionMonitor] Failed to refresh session:', error);
    }
  }, [logout]);

  // Set up periodic session verification
  useEffect(() => {
    if (!sessionExpiration) return;

    const verificationInterval = setInterval(async () => {
      const currentExpiration = expirationRef.current;
      if (!currentExpiration) return;

      // Check session validity with server
      const sessionValid = await verifySessionAction();

      // Both branches below are known-invalid sessions — force (see above).
      if (!sessionValid) {
        await logout(ROUTES.AUTH.LOGIN, { force: true });
        return;
      }

      // Check if already expired
      if (isSessionExpired(currentExpiration)) {
        await logout(ROUTES.AUTH.LOGIN, { force: true });
        return;
      }

      // Update warning state
      if (isSessionExpiring(currentExpiration)) {
        const remaining = getTimeRemaining(currentExpiration);
        setSessionWarning({
          isExpiring: true,
          timeRemaining: remaining,
        });
      } else {
        setSessionWarning({
          isExpiring: false,
          timeRemaining: getTimeRemaining(currentExpiration),
        });
      }
    }, SESSION_CHECK_INTERVAL);

    return () => clearInterval(verificationInterval);
  }, [sessionExpiration, logout]);

  // Set up activity listeners to refresh session
  // Refresh is debounced to prevent excessive calls
  useEffect(() => {
    if (typeof window === 'undefined') return;

    window.addEventListener('mousedown', refreshSession);
    window.addEventListener('keydown', refreshSession);
    window.addEventListener('scroll', refreshSession, { passive: true });
    window.addEventListener('touchstart', refreshSession);

    return () => {
      window.removeEventListener('mousedown', refreshSession);
      window.removeEventListener('keydown', refreshSession);
      window.removeEventListener('scroll', refreshSession);
      window.removeEventListener('touchstart', refreshSession);
    };
  }, [refreshSession]);

  return {
    isExpiring: sessionWarning.isExpiring,
    timeRemaining: sessionWarning.timeRemaining,
    sessionExpiration,
    refreshSession,
    logout,
    isLoggingOut,
  };
}
