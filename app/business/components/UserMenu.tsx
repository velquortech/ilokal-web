'use client';

import Link from 'next/link';
import {
  UserIcon,
  Settings,
  FileText,
  HelpCircle,
  LogOut,
  Building2,
  ChevronsUpDown,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Branch } from '../libs/configs/config';
import { type User } from '@/lib/types/user';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useIsMobile } from '@/hooks/use-mobile';
import { SidebarMenuButton } from '@/components/ui/sidebar';

interface UserMenuProps {
  user: User | null;
  branches: Branch[];
  onLogout: () => void;
}

export function UserMenu({ user, branches, onLogout }: UserMenuProps) {
  const isMobile = useIsMobile();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <SidebarMenuButton
          size="lg"
          className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
        >
          {' '}
          <Avatar className="h-8 w-8 rounded-lg">
            <AvatarImage
              src={user?.avatar_url ?? undefined}
              alt={user?.full_name ?? 'Name'}
            />
            <AvatarFallback className="rounded-lg">CN</AvatarFallback>
          </Avatar>
          <div className="grid flex-1 text-left text-sm leading-tight">
            <span className="truncate font-medium">{user?.full_name}</span>
            <span className="truncate text-xs">{user?.email}</span>
          </div>
          <ChevronsUpDown className="ml-auto size-4" />
        </SidebarMenuButton>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg"
        side={isMobile ? 'bottom' : 'right'}
        align="end"
        sideOffset={4}
      >
        <DropdownMenuLabel className="inline-flex items-center gap-2 font-normal">
          <Avatar className="h-8 w-8 rounded-lg">
            <AvatarImage
              src={user?.avatar_url ?? undefined}
              alt={user?.full_name ?? 'Name'}
            />
            <AvatarFallback className="rounded-lg">CN</AvatarFallback>
          </Avatar>
          <div className="grid flex-1 text-left text-sm leading-tight">
            <span className="truncate font-medium">{user?.full_name}</span>
            <span className="truncate text-xs">{user?.email}</span>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem asChild>
            <Link href="/business/profile">
              <UserIcon className="mr-2 h-4 w-4" />
              Profile
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link href="/business/settings">
              <Settings className="mr-2 h-4 w-4" />
              Settings
            </Link>
          </DropdownMenuItem>

          <DropdownMenuSub>
            <DropdownMenuSubTrigger>
              <Building2 className="mr-2 h-4 w-4" />
              Switch Branch
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent className="w-56">
              <DropdownMenuRadioGroup>
                {branches.map((branch) => (
                  <DropdownMenuRadioItem key={branch.id} value={branch.id}>
                    {branch.name}
                  </DropdownMenuRadioItem>
                ))}
              </DropdownMenuRadioGroup>
            </DropdownMenuSubContent>
          </DropdownMenuSub>

          <DropdownMenuItem asChild>
            <Link href="/business/subscription">
              <FileText className="mr-2 h-4 w-4" />
              Subscription
            </Link>
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/business/help">
            <HelpCircle className="mr-2 h-4 w-4" />
            Help & Support
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          className="text-destructive focus:text-destructive"
          onClick={onLogout}
        >
          <LogOut className="mr-2 h-4 w-4" />
          Log out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
