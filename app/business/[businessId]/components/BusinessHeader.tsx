'use client';

import { useEffect, useMemo } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { SidebarTrigger, useSidebar } from '@/components/ui/sidebar';
import { BranchSelector } from './BranchSelector';
import { ThemeToggle } from '@/components/custom/ThemeTogge';
import { NotificationBell } from '@/components/custom/NotificationBell';
import type { Branch as BranchSelectorItem } from '../libs/configs/config';
// import { useAIContext } from './AIChatSheet'; // TODO: re-enable with AI assistant
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
  // const { setIsAIChatOpen } = useAIContext(); // TODO: re-enable with AI assistant
  const { business, setSelectedBranchId } = useBusinessShop();
  const { state } = useSidebar();

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
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <SidebarTrigger className="h-9 w-9" />
          {/* The sidebar now opens by default (seeded from the `sidebar_state`
              cookie), but an owner who collapsed it would otherwise have their
              own shop name nowhere on the screen they use all day. Shown only
              while collapsed — the sidebar header prints it when open, and
              twice is just chrome. */}
          {business?.shop_name && state === 'collapsed' && (
            <span className="font-display hidden truncate text-base leading-none font-bold tracking-tight sm:inline">
              {business.shop_name}
            </span>
          )}
        </div>

        <div className="flex items-center">
          <div
            className="hidden items-center gap-2 sm:flex"
            data-tour="notifications"
          >
            {/* TODO: re-enable once the AI assistant is functional */}
            {/* <button
              onClick={() => setIsAIChatOpen((prev) => !prev)}
              className="font-giest-mono inline-flex cursor-pointer items-center gap-1 rounded-full bg-linear-to-r from-fuchsia-600 to-pink-600 px-3 py-1.5 text-xs font-medium text-white"
            >
              <Sparkles className="size-4" />
              Ask (BETA)
            </button> */}
            <NotificationBell />
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
