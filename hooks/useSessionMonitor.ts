'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAuthStore } from '@/services/stores/authStore';
import { verifySessionAction, logoutAction } from '@/app/(auth)/actions';
import {
  SESSION_CHECK_INTERVAL,
  getSessionTimeout,
  isSessionExpired,
  isSessionExpiring,
  getTimeRemaining,
} from '@/lib/auth/sessionConfig';

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

  // Initialize session expiration time on user login
  useEffect(() => {
    if (user) {
      const timeoutMinutes = getSessionTimeout(user.role);
      const expirationTime = Date.now() + timeoutMinutes * 60 * 1000;
      setSessionExpiration(expirationTime);
    } else {
      setSessionExpiration(null);
    }
  }, [user?.id]); // Depend on user ID to detect login changes

  // Set up periodic session verification
  useEffect(() => {
    if (!user || !sessionExpiration) return;

    const unsubscribe = setInterval(async () => {
      // Check session validity
      const sessionValid = await verifySessionAction();

      if (!sessionValid) {
        // Session is no longer valid, logout immediately
        try {
          await logoutAction();
        } catch {
          // Fallback: Clear auth state if logout fails
          useAuthStore.getState().logout();
        }
        return;
      }

      // Check if expired or expiring
      if (isSessionExpired(sessionExpiration)) {
        // Session has expired, logout
        try {
          await logoutAction();
        } catch {
          useAuthStore.getState().logout();
        }
        return;
      }

      // Check if expiring soon
      if (isSessionExpiring(sessionExpiration)) {
        const remaining = getTimeRemaining(sessionExpiration);
        setSessionWarning({
          isExpiring: true,
          timeRemaining: remaining,
        });
      } else {
        // Session still has plenty of time
        setSessionWarning({
          isExpiring: false,
          timeRemaining: getTimeRemaining(sessionExpiration),
        });
      }
    }, SESSION_CHECK_INTERVAL);

    return () => clearInterval(unsubscribe);
  }, [user, sessionExpiration]);

  // Handle user activity to refresh session
  const refreshSession = useCallback(() => {
    if (user && sessionExpiration) {
      const timeoutMinutes = getSessionTimeout(user.role);
      const newExpirationTime = Date.now() + timeoutMinutes * 60 * 1000;
      setSessionExpiration(newExpirationTime);
      setSessionWarning({
        isExpiring: false,
        timeRemaining: timeoutMinutes,
      });
    }
  }, [user, sessionExpiration]);

  // Set up activity listeners to refresh session
  useEffect(() => {
    if (!user) return;

    const handleActivity = () => {
      refreshSession();
    };

    // Listen for user interactions
    window.addEventListener('mousedown', handleActivity);
    window.addEventListener('keydown', handleActivity);
    window.addEventListener('scroll', handleActivity, { passive: true });
    window.addEventListener('touchstart', handleActivity);

    return () => {
      window.removeEventListener('mousedown', handleActivity);
      window.removeEventListener('keydown', handleActivity);
      window.removeEventListener('scroll', handleActivity);
      window.removeEventListener('touchstart', handleActivity);
    };
  }, [user, refreshSession]);

  return {
    isExpiring: sessionWarning.isExpiring,
    timeRemaining: sessionWarning.timeRemaining,
    sessionExpiration,
    refreshSession,
  };
}
