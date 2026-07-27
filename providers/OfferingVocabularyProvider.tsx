'use client';

/**
 * Carries the server-resolved offering vocabulary into the client tree.
 *
 * The catalogue dialogs, stats cards, and table are Client Components, so they
 * cannot await the DB read themselves. The business layout resolves it once
 * per request and hands the finished object down — no client fetch, no
 * loading state, no flash of "Product" before "Service".
 *
 * Consuming outside the provider is not an error: it returns the retail
 * default, which is the copy those surfaces used before phase 2. That keeps
 * the shared `components/custom/*` usable from surfaces that have no business
 * context (admin views, the landing page) without a crash.
 */

import { createContext, useContext, type ReactNode } from 'react';
import { DEFAULT_OFFERING_VOCABULARY } from '@/lib/utils/offeringVocabulary';
import type { OfferingVocabulary } from '@/lib/types/offering';

const offeringVocabularyContext = createContext<OfferingVocabulary>(
  DEFAULT_OFFERING_VOCABULARY,
);

export function OfferingVocabularyProvider({
  children,
  vocabulary,
}: {
  children: ReactNode;
  vocabulary?: OfferingVocabulary | null;
}) {
  return (
    <offeringVocabularyContext.Provider
      value={vocabulary ?? DEFAULT_OFFERING_VOCABULARY}
    >
      {children}
    </offeringVocabularyContext.Provider>
  );
}

/** Always returns a complete vocabulary — retail default when unprovided. */
export function useOfferingVocabulary(): OfferingVocabulary {
  return useContext(offeringVocabularyContext);
}
