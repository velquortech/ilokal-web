'use client';

import { useEffect, useState, useRef, useMemo } from 'react';
import { useAuthStore } from '@/services/stores/authStore';
import { verifySessionAction, logoutAction } from '@/app/(auth)/actions';
import {
  SESSION_CHECK_INTERVAL,
  getSessionTimeout,
  isSessionExpired,
  isSessionExpiring,
  getTimeRemaining,
} from '@/config/sessionConfig';

interface SessionWarning {
  isExpiring: boolean;
  timeRemaining: number; // in minutes
}

/**
 * Hook to monitor session expiration
 *
 * Features:
 * - Periodically verifies session is still valid
 * - Detects expired sessions and logs out
 * - Warns when session is about to expire
 * - Automatically refreshes expiration time on user activity
 * - Optimized event listeners with proper cleanup
 * - Memoized refresh function to prevent infinite loops
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
  const user = useAuthStore((state) => state.user);
  const [sessionWarning, setSessionWarning] = useState<SessionWarning>({
    isExpiring: false,
    timeRemaining: 0,
  });
  const [sessionExpiration, setSessionExpiration] = useState<number | null>(
    null,
  );

  // Use ref to track the current expiration without creating new closures
  const expirationRef = useRef<number | null>(null);

  // Initialize session expiration time on user login
  useEffect(() => {
    if (user) {
      const timeoutMinutes = getSessionTimeout(user.role);
      const expirationTime = Date.now() + timeoutMinutes * 60 * 1000;
      expirationRef.current = expirationTime;
      setSessionExpiration(expirationTime);
    } else {
      expirationRef.current = null;
      setSessionExpiration(null);
    }
  }, [user?.id]);

  // Memoized refresh function to prevent new function creation on every render
  const refreshSession = useMemo(
    () => () => {
      if (!user) return;

      const timeoutMinutes = getSessionTimeout(user.role);
      const newExpirationTime = Date.now() + timeoutMinutes * 60 * 1000;
      expirationRef.current = newExpirationTime;
      setSessionExpiration(newExpirationTime);
      setSessionWarning({
        isExpiring: false,
        timeRemaining: timeoutMinutes,
      });
    },
    [user],
  );

  // Set up periodic session verification
  useEffect(() => {
    if (!user || !sessionExpiration) return;

    const verificationInterval = setInterval(async () => {
      const currentExpiration = expirationRef.current;
      if (!currentExpiration) return;

      // Check session validity
      const sessionValid = await verifySessionAction();

      if (!sessionValid) {
        try {
          await logoutAction();
        } catch {
          useAuthStore.getState().logout();
        }
        return;
      }

      // Check if expired or expiring
      if (isSessionExpired(currentExpiration)) {
        try {
          await logoutAction();
        } catch {
          useAuthStore.getState().logout();
        }
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
  }, [user, sessionExpiration]);

  // Set up activity listeners to refresh session - memoized handler
  useEffect(() => {
    if (!user) return;

    // Use memoized refreshSession from above
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
  }, [user, refreshSession]);

  return {
    isExpiring: sessionWarning.isExpiring,
    timeRemaining: sessionWarning.timeRemaining,
    sessionExpiration,
    refreshSession,
  };
}
