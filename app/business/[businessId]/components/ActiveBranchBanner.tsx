'use client';

import { MapPin, X } from 'lucide-react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { useBusinessShop } from '@/providers/BusinessProvider';
import type { Branch } from '@/lib/types';

interface ActiveBranchBannerProps {
  branches: Branch[];
}

export function ActiveBranchBanner({ branches }: ActiveBranchBannerProps) {
  const { selectedBranchId } = useBusinessShop();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  if (!selectedBranchId) return null;

  const branch = branches.find((b) => b.id === selectedBranchId);
  if (!branch) return null;

  const handleClear = () => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete('branch');
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname);
  };

  return (
    <div className="flex items-center justify-between border-b bg-blue-50 px-4 py-2 text-sm dark:bg-blue-950/40">
      <div className="flex items-center gap-2 text-blue-800 dark:text-blue-200">
        <MapPin className="size-3.5 shrink-0" />
        <span>
          Viewing branch: <span className="font-semibold">{branch.name}</span>
          {branch.address && (
            <span className="text-blue-600 dark:text-blue-400">
              {' '}
              — {branch.address}
            </span>
          )}
        </span>
      </div>
      <button
        onClick={handleClear}
        className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-200"
        aria-label="Clear branch filter"
      >
        <X className="size-3.5" />
      </button>
    </div>
  );
}
