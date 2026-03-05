'use client';

import { useEffect } from 'react';
import { useAuthStore } from '@/lib/stores/authStore';
import { useSessionMonitor } from '@/hooks/useSessionMonitor';
import { verifySessionAction } from '@/app/(auth)/actions';

interface AuthProviderProps {
  children: React.ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const setUser = useAuthStore((state) => state.setUser);
  const setIsLoading = useAuthStore((state) => state.setIsLoading);

  // Initialize session monitoring hook
  useSessionMonitor();

  useEffect(() => {
    // Verify session on mount
    const verifySession = async () => {
      setIsLoading(true);
      try {
        const response = await verifySessionAction();
        if (response?.user) {
          setUser(response.user);
        } else {
          // Session is not valid
          setUser(null);
        }
      } catch {
        // Session verification failed, user will need to login
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };

    verifySession();
  }, [setUser, setIsLoading]);

  return <>{children}</>;
}
