'use client';

import { useState } from 'react';
import { MapPin, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { GlobalSearch } from '../../../components/custom/GlobalSearch';
import { BranchSelector } from './BranchSelector';
import { ActionButton } from '@/components/custom/ActionButton';
import { ThemeToggle } from '@/components/custom/ThemeTogge';
import { DEFAULT_BRANCHES, notificationActions } from '../libs/configs/config';

export function BusinessHeader({
  onAIChatClick,
}: {
  onAIChatClick?: () => void;
}) {
  const isAdmin = true;
  const [selectedBranch, setSelectedBranch] = useState('all');

  const currentBranch =
    selectedBranch === 'all'
      ? DEFAULT_BRANCHES[0]
      : DEFAULT_BRANCHES.find((b) => b.id === selectedBranch) ||
        DEFAULT_BRANCHES[1];

  return (
    <header className="bg-background/95 supports-backdrop-filter:bg-background/60 sticky top-0 z-40 w-full border-b backdrop-blur">
      <div className="flex h-16 items-center gap-4 px-4">
        <div className="flex flex-1 items-center gap-4">
          <SidebarTrigger className="h-9 w-9" />
          <GlobalSearch />
        </div>

        <div className="flex items-center">
          <div className="hidden items-center gap-2 sm:flex">
            <button
              onClick={onAIChatClick}
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

          {isAdmin ? (
            <BranchSelector
              branches={DEFAULT_BRANCHES}
              selectedBranch={selectedBranch}
              onSelect={setSelectedBranch}
              currentBranch={currentBranch}
            />
          ) : (
            <Button variant="outline" className="hidden h-full gap-2 md:flex">
              <MapPin className="h-4 w-4" />
              <span className="max-w-30 truncate">{currentBranch.name}</span>
            </Button>
          )}

          <div className="ml-2">
            <ThemeToggle />
          </div>
        </div>
      </div>
    </header>
  );
}
