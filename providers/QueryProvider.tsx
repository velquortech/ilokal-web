'use client';

import { ReactNode } from 'react';

/**
 * @deprecated This component is no longer needed.
 * The app/layout.tsx has been updated to remove QueryProvider.
 *
 * Just pass children directly to other providers.
 */
export function QueryProvider({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
