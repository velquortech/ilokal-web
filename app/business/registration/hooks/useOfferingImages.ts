'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { getFiles, putFiles, removeFiles, MAX_CACHE_BYTES } from './fileCache';

/**
 * The photos attached to wizard offerings.
 *
 * Two consumers need them and neither can pass props to the other: the menu
 * step, which collects them, and `performSubmission`, which uploads them after
 * the business row finally exists. So they live here and the provider mounts
 * one instance.
 *
 * Why a Map keyed by the row's `uid` and not the array index (IMG2): the cache
 * is keyed by field name, and index keys re-map every time an item is removed
 * — deleting item 1 would silently move item 2's photo onto item 1. The uid is
 * minted with the row and never changes.
 *
 * Memory is authoritative; IndexedDB is the reload backup. A failed cache
 * write therefore costs the owner nothing in the session that picked the file
 * — only across a reload — which is the right failure direction for something
 * that is optional decoration on a required item.
 */

const KEY_PREFIX = 'offering_image:';

const cacheKey = (uid: string) => `${KEY_PREFIX}${uid}`;

export interface OfferingImages {
  /** Attach (or clear) the photo for a row. Never throws. */
  set: (uid: string, file: File | null) => void;
  get: (uid: string) => File | undefined;
  /** Forget a row's photo and delete its cached blob. */
  remove: (uid: string) => void;
  /** Pull cached photos back after a reload, for the rows that still exist. */
  hydrate: (uids: string[]) => Promise<void>;
  /** True once every byte held is also cached — false means a reload loses them. */
  cached: boolean;
}

export function useOfferingImages(): OfferingImages {
  const filesRef = useRef<Map<string, File>>(new Map());
  const [cached, setCached] = useState(true);

  /**
   * IMG4 — the cache's own 25 MB ceiling is measured PER FIELD KEY, and each
   * row gets its own key, so nothing there notices twenty 2 MB photos. This is
   * the only guard across the whole set.
   *
   * Over budget the photos are kept in memory and simply not cached: the form
   * keeps working and the owner keeps their pictures, they just would not
   * survive a reload. Blocking the picker would be a worse trade — the photo
   * is optional and the item is not.
   */
  const recomputeCacheHealth = useCallback(() => {
    let total = 0;
    filesRef.current.forEach((file) => {
      total += file.size;
    });
    setCached(total <= MAX_CACHE_BYTES);
    return total <= MAX_CACHE_BYTES;
  }, []);

  const set = useCallback(
    (uid: string, file: File | null) => {
      if (!file) {
        filesRef.current.delete(uid);
        void removeFiles(cacheKey(uid));
        recomputeCacheHealth();
        return;
      }

      filesRef.current.set(uid, file);
      const withinBudget = recomputeCacheHealth();
      // Fire and forget: `putFiles` resolves rather than rejects, and a cache
      // miss must never hold up the form.
      if (withinBudget) void putFiles(cacheKey(uid), [file]);
    },
    [recomputeCacheHealth],
  );

  const get = useCallback((uid: string) => filesRef.current.get(uid), []);

  const remove = useCallback(
    (uid: string) => {
      filesRef.current.delete(uid);
      // IMG3 — without this every discarded photo stays in IndexedDB for the
      // life of the origin.
      void removeFiles(cacheKey(uid));
      recomputeCacheHealth();
    },
    [recomputeCacheHealth],
  );

  const hydrate = useCallback(
    async (uids: string[]) => {
      await Promise.all(
        uids.map(async (uid) => {
          if (filesRef.current.has(uid)) return;
          const files = await getFiles(cacheKey(uid));
          if (files[0]) filesRef.current.set(uid, files[0]);
        }),
      );
      recomputeCacheHealth();
    },
    [recomputeCacheHealth],
  );

  // Nothing to clean up on unmount: the blobs are the owner's work in progress
  // and the wizard remounts across steps. `clearCache()` on a completed
  // registration is what clears the store.
  useEffect(() => undefined, []);

  return { set, get, remove, hydrate, cached };
}
