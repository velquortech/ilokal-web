'use client';

import Image, { type ImageProps } from 'next/image';
import { useCallback, useRef, useState } from 'react';
import { BrokenImage } from './BrokenImage';

interface SafeImageProps extends ImageProps {
  /**
   * Classes for the `BrokenImage` placeholder, REPLACING the image's own
   * `className`. Use where a broken image has no intrinsic size to fall back
   * on and the image's classes would collapse it — e.g. a natural-ratio
   * gallery tile needs a `min-h-*` (and any `h-auto`/`w-auto` from the image
   * would shrink it to just the icon). Omit to inherit the image's shape
   * (round avatars stay round).
   */
  fallbackClassName?: string;
}

const STORAGE_PATH_MARKER = '/storage/v1/object/public/';

/**
 * The origin of the storage the app is wired to — `NEXT_PUBLIC_SUPABASE_URL`
 * (e.g. http://127.0.0.1:54321 in local dev, the cloud host in prod).
 * Computed lazily so tests can stub the env var.
 */
function storageOrigin(): string | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!url) return null;
  try {
    const parsed = new URL(url);
    return parsed.port
      ? `${parsed.protocol}//${parsed.hostname}:${parsed.port}`
      : `${parsed.protocol}//${parsed.hostname}`;
  } catch {
    return null;
  }
}

/**
 * If `src` is an ABSOLUTE cloud storage URL
 * (https://<host>/storage/v1/object/public/<bucket>/<path>) pointing at a
 * DIFFERENT origin than the app's own storage, rewrite it to the same path on
 * the app's storage origin. That is the offline-dev fallback: `make pull-live`
 * syncs every live object into LOCAL storage, so a cloud URL that fails to
 * load (machine offline, host unreachable, CSP in a local snapshot) can be
 * retried against 127.0.0.1:54321 — where the file actually exists.
 *
 * Returns null when there is nothing to retry: a relative path (already
 * local), a non-storage host (e.g. an Unsplash stock photo), or a URL already
 * on the app's own origin (retrying would be pointless — it just fails again).
 */
export function localStorageFallbackFor(src: string): string | null {
  const origin = storageOrigin();
  if (!origin || !src.startsWith('http')) return null;
  const idx = src.indexOf(STORAGE_PATH_MARKER);
  if (idx === -1) return null;
  const rewritten = `${origin}${src.slice(idx)}`;
  if (rewritten === src) return null;
  return rewritten;
}

/**
 * The app's single storage-image component: `next/image` with the rules every
 * storage surface must obey, enforced in one place.
 *
 * 1. `unoptimized` — these files are WebP converted at WRITE time, and the free
 *    Supabase plan has no transform endpoint for Next's optimizer to proxy, so
 *    routing them through `/_next/image` makes the browser get a 400 and the
 *    image render broken (while the mobile app, which requests the URL
 *    directly, shows it fine). Forcing it here — rather than at each call site
 *    — means a new card cannot reintroduce that regression by omission.
 * 2. Broken-image fallback — a URL that resolves but no longer exists (or is
 *    blocked) swaps to `BrokenImage` instead of the browser's broken glyph.
 *    The error state resets when `src` changes, so replacing an image
 *    (uploader previews, re-edit) re-arms the fallback rather than sticking on
 *    the old failure.
 * 3. Offline local-storage retry — an ABSOLUTE cloud URL that fails to load
 *    (dev machine offline, or a local snapshot carrying cloud URLs) is retried
 *    ONCE against the app's own storage origin before the placeholder, because
 *    `make pull-live` syncs the same objects into local storage. In prod the
 *    app's origin IS the cloud host, so the retry is a no-op there.
 *
 * Everything else — `fill`, `sizes`, `priority`, `loading`, `className` —
 * passes through untouched. The fallback fills the frame a `fill` image would
 * have used; for width/height images it inherits the image's `className`, so
 * the placeholder takes the same shape (e.g. a round avatar stays round).
 */
export function SafeImage({ fallbackClassName, ...props }: SafeImageProps) {
  const src = typeof props.src === 'string' ? props.src : '';
  // 0 = original src; 1 = the local-storage retry (only set when src is an
  // absolute cloud URL on a different origin and that retry exists).
  const [attempt, setAttempt] = useState(0);
  const [broken, setBroken] = useState(false);
  const lastSrc = useRef(src);
  if (lastSrc.current !== src) {
    lastSrc.current = src;
    setAttempt(0);
    setBroken(false);
  }
  const localFallback = localStorageFallbackFor(src);
  const effectiveSrc = attempt === 0 ? src : (localFallback ?? src);
  const onError = useCallback(() => {
    if (attempt === 0 && localFallback) {
      // First failure of a cloud URL: retry the local copy once.
      setAttempt(1);
    } else {
      // The retry (or the original, when none exists) failed — placeholder.
      setBroken(true);
    }
  }, [attempt, localFallback]);

  if (broken) {
    return (
      <BrokenImage
        className={
          fallbackClassName ?? (props.fill ? undefined : props.className)
        }
      />
    );
  }

  return <Image {...props} src={effectiveSrc} unoptimized onError={onError} />;
}
