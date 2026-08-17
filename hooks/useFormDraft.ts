'use client';

import { useCallback, useEffect, useRef } from 'react';
import type { FieldValues, UseFormReturn } from 'react-hook-form';

/**
 * localStorage draft persistence for a dialog form.
 *
 * The product and promo dialogs are long, and closing one mid-way loses
 * everything — the owner types a name, a price, a code, fat-fingers the X,
 * and the work is gone. This hook keeps the form's serializable values in
 * localStorage (debounced), so a closed dialog — or a reload — restores what
 * was in progress. Same shape as the registration wizard's `useFormCache`,
 * but for a single dialog form with no files to route around IndexedDB.
 *
 * The DIALOG owns the semantics: what counts as a draft (`pick`/`isEmpty`),
 * when it is restored (on open), and when it is discarded (on successful
 * submit). This hook only moves bytes, plus the debounced autosave.
 *
 * Notes:
 * - Files cannot be JSON-serialized; the caller's `pick` drops them, and the
 *   draft only ever restores what survived.
 * - Writes are best-effort: storage can be unavailable (private mode) or full
 *   (quota), and a draft is a convenience, never a source of truth — nothing
 *   here throws.
 * - A version field rides in the envelope so a schema change can invalidate
 *   old drafts instead of restoring garbage into a changed form.
 */
const DRAFT_VERSION = 1;

interface DraftEnvelope<P> {
  v: number;
  timestamp: number;
  values: P;
}

interface UseFormDraftOptions<T extends FieldValues, P> {
  /** The react-hook-form instance to watch. */
  form: UseFormReturn<T>;
  /** Storage key, scoped per business + dialog (e.g. `ilokal-product-draft:<id>`). */
  key: string;
  /** The serializable subset of form values to persist (files excluded). */
  pick: (values: T) => P;
  /** True when the picked values hold no meaningful draft — nothing to save. */
  isEmpty: (picked: P) => boolean;
  /** When false (e.g. an edit dialog seeded from a row), no draft is written. */
  enabled?: boolean;
  debounceMs?: number;
  /** Drafts older than this are dropped on read. */
  maxAgeMs?: number;
}

export function useFormDraft<T extends FieldValues, P>({
  form,
  key,
  pick,
  isEmpty,
  enabled = true,
  debounceMs = 600,
  maxAgeMs = 7 * 24 * 60 * 60 * 1000,
}: UseFormDraftOptions<T, P>) {
  // Refs keep the subscription effect stable while always calling the LATEST
  // pick/isEmpty closures (which close over memoized form defaults).
  const pickRef = useRef(pick);
  pickRef.current = pick;
  const isEmptyRef = useRef(isEmpty);
  isEmptyRef.current = isEmpty;

  const readDraft = useCallback((): P | null => {
    if (typeof window === 'undefined' || !key) return null;
    try {
      const raw = window.localStorage.getItem(key);
      if (!raw) return null;

      const parsed = JSON.parse(raw) as DraftEnvelope<P>;
      if (parsed?.v !== DRAFT_VERSION || typeof parsed.timestamp !== 'number') {
        window.localStorage.removeItem(key);
        return null;
      }
      if (Date.now() - parsed.timestamp > maxAgeMs) {
        window.localStorage.removeItem(key);
        return null;
      }
      return parsed.values ?? null;
    } catch {
      // Unreadable JSON — purge the dead entry so it stops failing and stops
      // counting against the quota. Storage fully unavailable (private mode)
      // throws here too; ignore that, there is no key to clean either way.
      try {
        window.localStorage.removeItem(key);
      } catch {
        // storage unavailable
      }
      return null;
    }
  }, [key, maxAgeMs]);

  const clearDraft = useCallback(() => {
    if (typeof window === 'undefined' || !key) return;
    try {
      window.localStorage.removeItem(key);
    } catch {
      // Storage unavailable; there is nothing occupying the key either.
    }
  }, [key]);

  // Debounced autosave: any form value change schedules a write; a cleared
  // form schedules a removal. The subscription lives only while enabled.
  useEffect(() => {
    if (!enabled || !key) return;

    let timer: ReturnType<typeof setTimeout> | null = null;

    const subscription = form.watch(() => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        try {
          const picked = pickRef.current(form.getValues() as T);
          if (isEmptyRef.current(picked)) {
            window.localStorage.removeItem(key);
          } else {
            const envelope: DraftEnvelope<P> = {
              v: DRAFT_VERSION,
              timestamp: Date.now(),
              values: picked,
            };
            window.localStorage.setItem(key, JSON.stringify(envelope));
          }
        } catch {
          // Quota exceeded / storage blocked — the draft is a convenience.
        }
      }, debounceMs);
    });

    return () => {
      subscription.unsubscribe();
      if (timer) clearTimeout(timer);
    };
  }, [form, enabled, key, debounceMs]);

  return { readDraft, clearDraft };
}
