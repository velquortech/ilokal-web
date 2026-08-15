'use client';

import Link from 'next/link';
import { Building2, ChevronDown, Plus, BarChart3 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Branch } from '../libs/configs/config';
import { businessPath } from '@/config/routeConfig';

interface BranchSelectorProps {
  branches: Branch[];
  selectedBranch: string;
  onSelect: (branchId: string) => void;
  currentBranch: Branch;
  businessId?: string;
}
export function BranchSelector({
  branches,
  selectedBranch,
  onSelect,
  currentBranch,
  businessId,
}: BranchSelectorProps) {
  const bPath = (...segs: string[]) =>
    businessId
      ? businessPath(businessId, ...segs)
      : `/business/${segs.join('/')}`;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        {/* `data-tour` sits on the trigger that already exists rather than a
            wrapper: the tour measures this element. Below `md` the trigger is
            an icon-only 44px target (the branch NAME is the desktop part), so
            the mobile header keeps branch switching instead of hiding it. */}
        <Button
          variant="outline"
          className="flex h-11 w-11 items-center justify-center gap-2 px-0 md:h-9 md:w-auto md:px-4"
          data-tour="branch-switcher"
          aria-label="Select branch"
        >
          <Building2 className="h-4 w-4 shrink-0" />
          <span className="hidden max-w-30 truncate md:inline">
            {currentBranch.name}
          </span>
          <ChevronDown className="text-muted-foreground hidden h-4 w-4 md:inline" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-72">
        <DropdownMenuLabel className="flex items-center gap-2">
          <Building2 className="text-muted-foreground h-4 w-4" />
          Select Branch
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuRadioGroup value={selectedBranch} onValueChange={onSelect}>
          {branches.map((branch) => (
            <DropdownMenuRadioItem
              key={branch.id}
              value={branch.id}
              className="flex items-center gap-2"
            >
              <div className="flex flex-1 flex-col">
                <span className="font-medium">{branch.name}</span>
                <span className="text-muted-foreground text-xs">
                  {branch.location}
                </span>
              </div>
              {branch.isAdmin && (
                <Badge variant="secondary" className="text-xs">
                  Admin
                </Badge>
              )}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem asChild>
            <Link href={bPath('branches')}>
              <BarChart3 className="mr-2 h-4 w-4" />
              View All Branches
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link href={bPath('branches', 'create')}>
              <Plus className="mr-2 h-4 w-4" />
              Add New Branch
            </Link>
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
