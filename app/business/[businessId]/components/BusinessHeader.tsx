'use client';

import { useState } from 'react';
import { Sparkles } from 'lucide-react';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { BranchSelector } from './BranchSelector';
import { ActionButton } from '@/components/custom/ActionButton';
import { ThemeToggle } from '@/components/custom/ThemeTogge';
import { DEFAULT_BRANCHES, notificationActions } from '../libs/configs/config';
import { useAIContext } from './AIChatSheet';

export function BusinessHeader() {
  const [selectedBranch, setSelectedBranch] = useState('all');
  const { setIsAIChatOpen } = useAIContext();

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
            branches={DEFAULT_BRANCHES}
            selectedBranch={selectedBranch}
            onSelect={setSelectedBranch}
            currentBranch={currentBranch}
          />

          <div className="ml-2">
            <ThemeToggle />
          </div>
        </div>
      </div>
    </header>
  );
}
