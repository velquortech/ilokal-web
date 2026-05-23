/**
 * Custom hook for managing dashboard tour/onboarding dialog
 * Handles showing the tour on first visit and dismissing it
 */

import { useState, useEffect, useCallback } from 'react';

interface UseDashboardTourOptions {
  storageKey: string;
  delay?: number;
}

interface UseDashboardTourReturn {
  isOpen: boolean;
  openTour: () => void;
  closeTour: () => void;
  dismissTour: () => void;
  hasSeenTour: boolean;
}

/**
 * Hook for managing dashboard tour visibility
 * @param options - Configuration options
 * @returns Tour state and control functions
 */
export function useDashboardTour({
  storageKey,
  delay = 500,
}: UseDashboardTourOptions): UseDashboardTourReturn {
  const [isOpen, setIsOpen] = useState(false);
  const [hasSeenTour, setHasSeenTour] = useState(true);

  // Check if user has seen tour on mount
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const seen = window.localStorage.getItem(storageKey);
    if (!seen) {
      setHasSeenTour(false);
      const timer = setTimeout(() => {
        setIsOpen(true);
      }, delay);
      return () => clearTimeout(timer);
    }
  }, [storageKey, delay]);

  // Open the tour dialog
  const openTour = useCallback(() => {
    setIsOpen(true);
  }, []);

  // Close without marking as seen (allows reopening)
  const closeTour = useCallback(() => {
    setIsOpen(false);
  }, []);

  // Close and mark as seen (permanent dismissal)
  const dismissTour = useCallback(() => {
    setIsOpen(false);
    setHasSeenTour(true);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(storageKey, 'true');
    }
  }, [storageKey]);

  return {
    isOpen,
    openTour,
    closeTour,
    dismissTour,
    hasSeenTour,
  };
}
