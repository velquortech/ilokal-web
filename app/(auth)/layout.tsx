'use client';

import { ThemeToggle } from '@/components/custom/ThemeTogge';
import { AuthHeader } from './component/header';
import { ImageIcon } from 'lucide-react';

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="grid min-h-screen min-w-screen grid-cols-1 sm:grid-cols-2">
      <div className="relative flex">
        <div className="absolute top-5 left-0 z-10 inline-flex w-full items-center justify-between px-10">
          <AuthHeader />
          <ThemeToggle />
        </div>
        <div className="m-auto">{children}</div>
      </div>
      <div className="bg-primary/10 hidden h-full w-full sm:flex">
        <ImageIcon className="text-primary m-auto size-20 opacity-30" />
      </div>
    </div>
  );
}
