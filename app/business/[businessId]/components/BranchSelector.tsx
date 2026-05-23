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
        <Button variant="outline" className="hidden h-9 gap-2 md:flex">
          <Building2 className="h-4 w-4" />
          <span className="max-w-30 truncate">{currentBranch.name}</span>
          <ChevronDown className="text-muted-foreground h-4 w-4" />
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
