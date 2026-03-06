'use client';

import { useState } from 'react';
import { MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { GlobalSearch } from '../../../components/custom/GlobalSearch';
import { UserMenu } from './UserMenu';
import { BranchSelector } from './BranchSelector';
import { useAuth } from '@/hooks/useAuth';
import { ActionButton } from '@/components/custom/ActionButton';
import { ThemeToggle } from '@/components/custom/ThemeTogge';
import { DEFAULT_BRANCHES, notificationActions } from '../libs/configs/config';

export function BusinessHeader() {
  const { user, logout } = useAuth();

  const handleLogout = async () => {
    await logout();
  };

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

        <div className="flex items-center gap-2">
          <div className="hidden items-center gap-1 sm:flex">
            {notificationActions.map((action) => (
              <ActionButton key={action.href} action={action} />
            ))}
            <ThemeToggle />
          </div>
          <div className="bg-border hidden h-6 w-px sm:block" />

          {isAdmin ? (
            <BranchSelector
              branches={DEFAULT_BRANCHES}
              selectedBranch={selectedBranch}
              onSelect={setSelectedBranch}
              currentBranch={currentBranch}
            />
          ) : (
            <Button variant="outline" className="hidden h-9 gap-2 md:flex">
              <MapPin className="h-4 w-4" />
              <span className="max-w-30 truncate">{currentBranch.name}</span>
            </Button>
          )}

          <UserMenu
            user={user}
            branches={DEFAULT_BRANCHES}
            onLogout={handleLogout}
          />
        </div>
      </div>
    </header>
  );
}
