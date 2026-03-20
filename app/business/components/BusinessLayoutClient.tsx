'use client';

import React from 'react';
import { User } from '@/lib/types/user';

/**
 * BusinessLayoutClient Component
 *
 * Client-side wrapper for business dashboard layout
 * Receives authenticated user data from server
 * Manages interactive UI state (sidebar, navigation, etc.)
 *
 * Security:
 * - User authenticity verified server-side before rendering
 * - Only receives data the server deems safe to display
 * - No auth checks needed in this component
 */
export function BusinessLayoutClient({
  user: _user,
  children,
}: {
  user: User;
  children: React.ReactNode;
}) {
  // user prop is passed to verify authentication at server level
  // Can be used for business-specific features (e.g., header user menu, analytics tracking)
  return (
    <div className="flex h-screen bg-gray-50">
      <div className="flex-1 overflow-auto">
        <div className="p-8">{children}</div>
      </div>
    </div>
  );
}
