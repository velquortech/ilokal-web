'use client';

import { createContext, useContext } from 'react';
import { useSessionMonitor } from '@/hooks/useSessionMonitor';

type SessionMonitorValue = ReturnType<typeof useSessionMonitor>;

const SessionMonitorContext = createContext<SessionMonitorValue | null>(null);

/**
 * Owns the ONE `useSessionMonitor()` instance for a mounted tree.
 *
 * `useSessionMonitor` is a plain hook, so every component calling it directly
 * gets an independent monitor — its own `verifySessionAction()` on mount, its
 * own `SESSION_CHECK_INTERVAL` poll, its own window activity listeners and its
 * own `useAuth`. Two of those race the same forced navigation and report
 * unrelated `isLoggingOut` values. Consumers read the shared value via
 * `useSessionMonitorContext()` instead.
 *
 * ⚠️ NOT MOUNTED — see the note in `providers/AuthProvider.tsx`.
 */
export function SessionMonitorProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const value = useSessionMonitor();

  return (
    <SessionMonitorContext.Provider value={value}>
      {children}
    </SessionMonitorContext.Provider>
  );
}

export function useSessionMonitorContext(): SessionMonitorValue {
  const value = useContext(SessionMonitorContext);

  if (!value) {
    throw new Error(
      'useSessionMonitorContext must be used within a <SessionMonitorProvider>',
    );
  }

  return value;
}
