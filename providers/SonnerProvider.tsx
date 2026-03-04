'use client';

import { Toaster } from 'sonner';

export function SonnerProvider() {
  return (
    <Toaster
      position="top-right"
      theme="light"
      richColors
      duration={4000}
      closeButton
    />
  );
}
