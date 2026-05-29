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
    <div className="bg-primary/10 flex items-center justify-between border-b px-4 py-2 text-sm">
      <div className="text-primary flex items-center gap-2">
        <MapPin className="size-3.5 shrink-0" />
        <span>
          Viewing branch: <span className="font-semibold">{branch.name}</span>
          {branch.address && (
            <span className="text-primary/70"> — {branch.address}</span>
          )}
        </span>
      </div>
      <button
        onClick={handleClear}
        className="text-primary/70 hover:text-primary"
        aria-label="Clear branch filter"
      >
        <X className="size-3.5" />
      </button>
    </div>
  );
}
