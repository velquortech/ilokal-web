'use client';

import { useEffect, useState, useRef } from 'react';
import { verifySessionAction, logoutAction } from '@/app/(auth)/actions';
import {
  SESSION_CHECK_INTERVAL,
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
  const [sessionWarning, setSessionWarning] = useState<SessionWarning>({
    isExpiring: false,
    timeRemaining: 0,
  });
  const [sessionExpiration, setSessionExpiration] = useState<number | null>(
    null,
  );
  const expirationRef = useRef<number | null>(null);

  // Initialize session expiration time from localStorage on mount
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const storedExpiration = localStorage.getItem('sessionExpiration');
    if (storedExpiration) {
      const expirationTime = parseInt(storedExpiration, 10);
      expirationRef.current = expirationTime;
      setSessionExpiration(expirationTime);
    }
  }, []);

  // Memoized refresh function to reset session on user activity
  const refreshSession = () => {
    if (typeof window === 'undefined') return;

    const storedExpiration = localStorage.getItem('sessionExpiration');
    if (!storedExpiration) return;

    const timeoutMinutes = 30; // Default timeout, matches config default

    const newExpirationTime = Date.now() + timeoutMinutes * 60 * 1000;
    expirationRef.current = newExpirationTime;
    localStorage.setItem('sessionExpiration', newExpirationTime.toString());
    setSessionExpiration(newExpirationTime);
    setSessionWarning({
      isExpiring: false,
      timeRemaining: timeoutMinutes,
    });
  };

  // Set up periodic session verification
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!sessionExpiration) return;

    const verificationInterval = setInterval(async () => {
      const currentExpiration = expirationRef.current;
      if (!currentExpiration) return;

      // Check session validity with server
      const sessionValid = await verifySessionAction();

      if (!sessionValid) {
        try {
          await logoutAction();
        } catch {
          // logoutAction throws NEXT_REDIRECT, which is expected
          localStorage.removeItem('sessionExpiration');
        }
        return;
      }

      // Check if expired
      if (isSessionExpired(currentExpiration)) {
        try {
          await logoutAction();
        } catch {
          // logoutAction throws NEXT_REDIRECT, which is expected
          localStorage.removeItem('sessionExpiration');
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
  }, [sessionExpiration]);

  // Set up activity listeners to refresh session
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
  }, []);

  return {
    isExpiring: sessionWarning.isExpiring,
    timeRemaining: sessionWarning.timeRemaining,
    sessionExpiration,
    refreshSession,
  };
}
