'use client';

import { useEffect, useMemo } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { Sparkles } from 'lucide-react';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { BranchSelector } from './BranchSelector';
import { ActionButton } from '@/components/custom/ActionButton';
import { ThemeToggle } from '@/components/custom/ThemeTogge';
import { notificationActions } from '../libs/configs/config';
import type { Branch as BranchSelectorItem } from '../libs/configs/config';
import { useAIContext } from './AIChatSheet';
import { useBusinessShop } from '@/providers/BusinessProvider';
import type { Branch } from '@/lib/types';

const ALL_BRANCHES_ITEM: BranchSelectorItem = {
  id: 'all',
  name: 'All Branches',
  location: 'Overview',
  isAdmin: true,
};

interface BusinessHeaderProps {
  branches?: Branch[];
}

export function BusinessHeader({ branches = [] }: BusinessHeaderProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { setIsAIChatOpen } = useAIContext();
  const { business, setSelectedBranchId } = useBusinessShop();

  const branchParam = searchParams.get('branch');

  // Keep context in sync whenever the URL branch param changes
  useEffect(() => {
    setSelectedBranchId(branchParam ?? null);
  }, [branchParam, setSelectedBranchId]);

  const selectorBranches: BranchSelectorItem[] = useMemo(() => {
    const mapped = branches.map((b) => ({
      id: b.id,
      name: b.name,
      location: b.address ?? '',
      isAdmin: false,
    }));
    return [ALL_BRANCHES_ITEM, ...mapped];
  }, [branches]);

  const selectedBranchId = branchParam ?? 'all';

  const currentBranch =
    selectorBranches.find((b) => b.id === selectedBranchId) ??
    ALL_BRANCHES_ITEM;

  const handleSelect = (branchId: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (branchId === 'all') {
      params.delete('branch');
    } else {
      params.set('branch', branchId);
    }
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname);
  };

  return (
    <header className="bg-background/95 supports-backdrop-filter:bg-background/60 sticky top-0 z-40 w-full border-b backdrop-blur">
      <div className="flex h-16 items-center gap-4 px-4">
        <div className="flex flex-1 items-center gap-4">
          <SidebarTrigger className="h-9 w-9" />
        </div>

        <div className="flex items-center">
          <div className="hidden items-center gap-2 sm:flex">
            <button
              onClick={() => setIsAIChatOpen((prev) => !prev)}
              className="font-font-giest-mono inline-flex cursor-pointer items-center gap-1 rounded-full bg-linear-to-r from-fuchsia-600 to-pink-600 px-3 py-1.5 text-xs font-medium text-white"
            >
              <Sparkles className="size-4" />
              Ask (BETA)
            </button>
            {notificationActions.map((action) => (
              <ActionButton key={action.href} action={action} />
            ))}
          </div>

          <div className="bg-border mx-4 hidden h-9 w-px sm:block" />

          <BranchSelector
            branches={selectorBranches}
            selectedBranch={selectedBranchId}
            onSelect={handleSelect}
            currentBranch={currentBranch}
            businessId={business?.id}
          />

          <div className="ml-2">
            <ThemeToggle />
          </div>
        </div>
      </div>
    </header>
  );
}
