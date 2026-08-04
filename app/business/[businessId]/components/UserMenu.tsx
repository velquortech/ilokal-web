'use client';

import Link from 'next/link';
import { useRef } from 'react';
import {
  UserIcon,
  Settings,
  FileText,
  HelpCircle,
  LogOut,
  Loader2,
  ChevronsUpDown,
  Compass,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useIsMobile } from '@/hooks/use-mobile';
import { SidebarMenuButton } from '@/components/ui/sidebar';
import { useAuth } from '@/hooks/useAuth';
import { useUser } from '@/providers/UserContext';
import { useBusinessShop } from '@/providers/BusinessProvider';
import { businessPath, ROUTES } from '@/config/routeConfig';
import { useOnboardingTourContext } from '@/components/custom/onboarding/OnboardingTourProvider';

export function UserMenu() {
  const { logout, isLoggingOut } = useAuth();
  const user = useUser();
  const isMobile = useIsMobile();
  const { business } = useBusinessShop();
  const { enabled: tourEnabled, startTour } = useOnboardingTourContext();
  const bid = business?.id;
  const bPath = (...segs: string[]) =>
    bid ? businessPath(bid, ...segs) : `/business/${segs.join('/')}`;

  // The tour is started from `onCloseAutoFocus`, not from the item's `onSelect`.
  // Radix restores focus to the trigger when the menu UNMOUNTS — after its exit
  // animation — so starting earlier means (a) that late restore steals focus out
  // of the tour card, and (b) the element recorded for the end-of-tour restore
  // is a menu item that no longer exists. Preventing the default here hands the
  // whole focus decision to the tour, and the trigger is a live node to return
  // to.
  const triggerRef = useRef<HTMLButtonElement>(null);
  const startAfterClose = useRef(false);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <SidebarMenuButton
          ref={triggerRef}
          size="lg"
          className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
        >
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
        onCloseAutoFocus={(event) => {
          if (!startAfterClose.current) return;
          startAfterClose.current = false;
          event.preventDefault();
          startTour(triggerRef.current);
        }}
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
            <Link href={bPath('profile')}>
              <UserIcon className="mr-2 h-4 w-4" />
              Profile
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link href={bPath('settings')}>
              <Settings className="mr-2 h-4 w-4" />
              Settings
            </Link>
          </DropdownMenuItem>

          <DropdownMenuItem asChild>
            <Link href={bPath('subscription')}>
              <FileText className="mr-2 h-4 w-4" />
              Subscription
            </Link>
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        {/* Absent, not disabled, when the kill switch is off — a menu entry
            that opens nothing is worse than one that isn't there. */}
        {tourEnabled && (
          <DropdownMenuItem
            onSelect={() => {
              // Deferred to `onCloseAutoFocus` above — see the note there.
              startAfterClose.current = true;
            }}
          >
            <Compass className="mr-2 h-4 w-4" />
            Replay tour
          </DropdownMenuItem>
        )}
        <DropdownMenuItem asChild>
          <Link href={bPath('help')}>
            <HelpCircle className="mr-2 h-4 w-4" />
            Help & Support
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          className="text-destructive focus:text-destructive"
          disabled={isLoggingOut}
          // Keep the menu open so the busy state is visible during sign-out.
          onSelect={(e) => {
            e.preventDefault();
            void logout(ROUTES.AUTH.SIGN_IN);
          }}
        >
          {isLoggingOut ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Signing out…
            </>
          ) : (
            <>
              <LogOut className="mr-2 h-4 w-4" />
              Log out
            </>
          )}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
