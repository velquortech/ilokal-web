'use client';

import { createContext, useContext, ReactNode } from 'react';

interface AdminContextType {
  adminId: string;
}

const adminContext = createContext<AdminContextType | undefined>(undefined);

/**
 * AdminProvider - carries the current admin's id (the `[adminId]` route segment)
 * to client components in the admin shell. Mirrors BusinessShopProvider's shape,
 * kept minimal since admin pages only need the id for path injection.
 */
export function AdminProvider({
  children,
  adminId,
}: {
  children: ReactNode;
  adminId: string;
}) {
  return (
    <adminContext.Provider value={{ adminId }}>
      {children}
    </adminContext.Provider>
  );
}

export const useAdmin = () => {
  const context = useContext(adminContext);
  if (context === undefined) {
    throw new Error('useAdmin must be used within an AdminProvider');
  }
  return context;
};
