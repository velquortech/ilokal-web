'use client';

import { Toaster } from 'sonner';
import { ThemeToggle } from '@/components/custom/ThemeTogge';
import { AuthHeader } from './component/header';

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col">
      <Toaster position="top-center" />
      <div className="flex shrink-0 items-center justify-between px-8 py-5">
        <AuthHeader />
        <ThemeToggle />
      </div>
      <div className="flex flex-1 items-center justify-center px-6 py-10">
        {children}
      </div>
    </div>
  );
}
