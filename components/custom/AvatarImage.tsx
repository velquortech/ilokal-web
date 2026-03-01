'use client';

import React from 'react';
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
 * Uses standard img tag for localhost/development URLs to avoid optimization issues,
 * and Next.js Image component for production URLs.
 */
export function AvatarImage({
  src,
  alt,
  width = 40,
  height = 40,
  className = 'h-10 w-10 rounded-full object-cover',
}: AvatarImageProps) {
  // Use standard img tag for localhost URLs (development)
  if (src && src.includes('127.0.0.1')) {
    return (
      <img
        src={src}
        alt={alt}
        width={width}
        height={height}
        className={className}
      />
    );
  }

  // Use Next.js Image component for optimized production URLs
  return (
    <Image
      src={src || ''}
      alt={alt}
      width={width}
      height={height}
      className={className}
    />
  );
}
