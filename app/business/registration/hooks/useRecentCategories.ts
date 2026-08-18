'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

const RECENT_CATEGORIES_KEY = 'ilokal-recent-categories';
const MAX_RECENT_CATEGORIES = 5;

export type RecentCategory = { id: string; name: string };

/**
 * The categories this browser's owner has picked in the registration wizard,
 * most recent first. A returning owner — registering a second shop, or one who
 * abandoned mid-flow and came back — finds their last picks at the top of the
 * category grid instead of hunting for them again.
 *
 * LocalStorage (like the rest of the wizard's resume state) rather than the
 * DB: the history is a convenience and must work before a business row exists.
 * Best-effort throughout — an unavailable or full store never breaks
 * registration.
 */
/** Best-effort write; an unavailable or full store never breaks registration. */
function persist(next: RecentCategory[]) {
  try {
    localStorage.setItem(RECENT_CATEGORIES_KEY, JSON.stringify(next));
  } catch {
    // History is a convenience, not part of the registration contract.
  }
}

export function useRecentCategories() {
  const [recents, setRecents] = useState<RecentCategory[]>([]);
  // Mirrors `recents` so `record` can derive the next list WITHOUT a state
  // updater. Two successive picks in one tick still see each other, which a
  // plain read of `recents` from the closure would not.
  const recentsRef = useRef<RecentCategory[]>([]);

  // Hydration-safe read: the server render has no localStorage, so the list
  // loads after mount.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const raw = localStorage.getItem(RECENT_CATEGORIES_KEY);
      if (!raw) return;
      const parsed: unknown = JSON.parse(raw);
      if (!Array.isArray(parsed)) return;
      const loaded = parsed
        .filter(
          (r): r is RecentCategory =>
            !!r && typeof r.id === 'string' && typeof r.name === 'string',
        )
        .slice(0, MAX_RECENT_CATEGORIES);
      recentsRef.current = loaded;
      setRecents(loaded);
    } catch {
      // Unreadable history is not worth interrupting the wizard.
    }
  }, []);

  /** Move a picked category to the front of the history, dropping the oldest
   *  once the cap is hit. Idempotent, so a re-pick never duplicates. */
  const record = useCallback((id: string, name: string) => {
    // Derived and persisted OUTSIDE any state updater. An updater must be
    // pure — StrictMode invokes it twice, so a localStorage write in there
    // runs twice per pick. Idempotent today, but it is the defect this repo
    // already fixed once (`onFinish()` called inside a `setIndex` updater),
    // and the next effect put there may not be idempotent.
    const next = [
      { id, name },
      ...recentsRef.current.filter((r) => r.id !== id),
    ].slice(0, MAX_RECENT_CATEGORIES);

    recentsRef.current = next;
    setRecents(next);
    persist(next);
  }, []);

  return { recents, record };
}
