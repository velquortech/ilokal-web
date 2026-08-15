'use client';

/**
 * Carries the owner-facing locale into the client tree.
 *
 * Per spec §8.1, deliberately NOT an i18n framework — a typed copy map
 * (`lib/copy/owner.ts`) with a locale that defaults to `en`. The Filipino
 * variant stays GATED: `OWNER_COPY.fil` is a draft pending native-speaker
 * review (§8.3), so nothing flips the locale at runtime until the rollout
 * phase wires a real setting. Mounting the provider is optional — the
 * default `en` is what every surface renders today.
 *
 * Same contract as `OfferingVocabularyProvider`: consuming outside the
 * provider returns the English default, never `undefined` — so shared
 * components usable from surfaces without a business context (admin views,
 * the landing page) don't crash.
 */

import { createContext, useContext, type ReactNode } from 'react';
import {
  OWNER_COPY,
  ownerCopyFor,
  type Locale,
  type OwnerCopy,
} from '@/lib/copy/owner';

const localeContext = createContext<{
  locale: Locale;
  copy: OwnerCopy;
}>({
  locale: 'en',
  copy: OWNER_COPY.en,
});

export function LocaleProvider({
  children,
  locale = 'en',
}: {
  children: ReactNode;
  locale?: Locale | string | null;
}) {
  const resolved = ownerCopyFor(locale);
  return (
    <localeContext.Provider
      value={{
        locale: resolved === OWNER_COPY.fil ? 'fil' : 'en',
        copy: resolved,
      }}
    >
      {children}
    </localeContext.Provider>
  );
}

/** The active locale ('en' unless a future setting flips it). */
export function useLocale(): Locale {
  return useContext(localeContext).locale;
}

/** The full owner copy for the active locale — always complete, never undefined. */
export function useOwnerCopy(): OwnerCopy {
  return useContext(localeContext).copy;
}
