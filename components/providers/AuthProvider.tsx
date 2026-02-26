'use client';

import { useEffect } from 'react';
import { useAuthStore } from '@/lib/stores/authStore';
import authService from '@/lib/api/authService';

interface AuthProviderProps {
  children: React.ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const setUser = useAuthStore((state) => state.setUser);
  const setIsLoading = useAuthStore((state) => state.setIsLoading);

  useEffect(() => {
    // Verify session on mount
    const verifySession = async () => {
      setIsLoading(true);
      try {
        const response = await authService.verifySession();
        if (response.user) {
          setUser(response.user);
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
