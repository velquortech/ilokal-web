'use client';

import Image from 'next/image';

interface AvatarImageProps {
  src: string | null | undefined;
  alt: string;
  width?: number;
  height?: number;
  className?: string;
}

/**
 * Avatar image component that handles both optimized and unoptimized images.
 * Uses unoptimized Image component for localhost/development URLs
 * and optimized Image component for production URLs.
 */
export function AvatarImage({
  src,
  alt,
  width = 40,
  height = 40,
  className = 'h-10 w-10 rounded-full object-cover',
}: AvatarImageProps) {
  // Use unoptimized for localhost URLs (development)
  const isLocalhost = !!(src && src.includes('127.0.0.1'));

  return (
    <Image
      src={src || ''}
      alt={alt}
      width={width}
      height={height}
      className={className}
      unoptimized={isLocalhost}
    />
  );
}
