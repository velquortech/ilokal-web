'use client';

import Image from 'next/image';
import { ThemeToggle } from '@/components/custom/ThemeTogge';
import { AuthHeader } from './component/header';

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen">
      {/* Toasts render via the root layout's top-right <Toaster> — mounting a
          second one here duplicated every toast. */}

      {/* Left panel — form */}
      <div className="flex w-full flex-col lg:w-1/2">
        <div className="flex shrink-0 items-center justify-between px-8 py-5">
          <AuthHeader />
          <ThemeToggle />
        </div>
        <div className="flex flex-1 items-center justify-center px-6 py-10">
          {children}
        </div>
      </div>

      {/* Right panel — image, hidden on mobile */}
      <div className="relative hidden lg:block lg:w-1/2">
        <Image
          src="/images/login.jpg"
          alt="Ilokal"
          fill
          className="object-cover"
          priority
        />
      </div>
    </div>
  );
}
