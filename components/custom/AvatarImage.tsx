'use client';

import { SafeImage } from './SafeImage';
import { BrokenImage } from './BrokenImage';

interface AvatarImageProps {
  src: string | null | undefined;
  alt: string;
  width?: number;
  height?: number;
  className?: string;
}

/**
 * Avatar image component.
 *
 * Renders through `SafeImage`, the shared storage-image component: always
 * unoptimized (avatars live in Supabase storage as write-time WebP, and the
 * free plan has no transform endpoint for Next's optimizer to proxy — the same
 * reason every other storage thumbnail in the app loads directly), and a
 * broken URL swaps to `BrokenImage` instead of the browser's broken glyph.
 * A missing `src` renders the placeholder outright.
 */
export function AvatarImage({
  src,
  alt,
  width = 40,
  height = 40,
  className = 'h-10 w-10 rounded-full object-cover',
}: AvatarImageProps) {
  return src ? (
    <SafeImage
      src={src}
      alt={alt}
      width={width}
      height={height}
      className={className}
    />
  ) : (
    <BrokenImage className={className} />
  );
}
