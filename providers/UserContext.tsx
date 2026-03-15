import React, { createContext, useContext } from 'react';
import { User } from '@/lib/types/user';

/**
 * UserContext - Provides authenticated user data to client components
 *
 * Usage:
 * - Wrap your component tree with <UserProvider user={user}>
 * - Use useUser() hook in child components to access user data
 *
 * Benefits:
 * - Eliminates need for Zustand store for user data
 * - Follows React best practices
 * - Type-safe with TypeScript
 * - Enables proper server/client split
 */

const userContext = createContext<User | null>(null);

interface UserProviderProps {
  user: User | null;
  children: React.ReactNode;
}

/**
 * UserProvider - Provides user data through context
 * @param user - The authenticated user object, or null if not authenticated
 * @param children - React components that may use useUser()
 */
export function UserProvider({ user, children }: UserProviderProps) {
  return <userContext.Provider value={user}>{children}</userContext.Provider>;
}

/**
 * useUser - Hook to access current user data
 * @returns The authenticated user object, or null if not authenticated
 * @throws Error if used outside of UserProvider
 */
export function useUser(): User | null {
  const context = useContext(userContext);
  if (context === undefined) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
}
