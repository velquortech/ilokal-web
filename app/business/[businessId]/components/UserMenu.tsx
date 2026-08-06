'use client';

import Link from 'next/link';
import { useRef } from 'react';
import {
  UserIcon,
  Settings,
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
import { initialsFromName } from '@/lib/utils/initials';
import { useOnboardingTourContext } from '@/components/custom/onboarding/OnboardingTourProvider';

/**
 * Which picture the account control shows, and what it is called.
 *
 * The shop's own logo leads, the owner's personal avatar is the fallback, and
 * the shop's initials are the last resort. Exported and pure because the only
 * honest way to assert it is directly: Radix mounts `<AvatarImage>` only once
 * the image has actually loaded, and nothing loads under happy-dom, so a DOM
 * test for the `src` passes whether the logic is right or not.
 *
 * `alt` is derived from the SAME choice as `src`, so the picture can never be
 * labelled as the other thing.
 */
export function resolveAccountAvatar(
  business?: { shop_name?: string | null; logo_url?: string | null } | null,
  user?: { full_name?: string | null; avatar_url?: string | null } | null,
): { src?: string; alt: string; initials: string } {
  const usingShopLogo = Boolean(business?.logo_url);
  return {
    src: business?.logo_url ?? user?.avatar_url ?? undefined,
    alt: usingShopLogo
      ? (business?.shop_name ?? 'Your shop')
      : (user?.full_name ?? 'Your account'),
    // The fallback was the literal string `"CN"` — shadcn's placeholder, two
    // letters belonging to nobody, on the one control that says who is signed
    // in. Blank rather than guessed when there is no name at all: an empty
    // circle reads as "no picture", while stray letters read as someone else's
    // account.
    initials: initialsFromName(business?.shop_name ?? user?.full_name),
  };
}

/**
 * The trigger and the menu label render the same avatar. Extracted so the two
 * cannot drift — the whole point of this pass is that one of them was showing
 * shadcn's placeholder `"CN"`.
 */
function AccountAvatar({
  src,
  alt,
  initials,
}: {
  src?: string;
  alt: string;
  initials: string;
}) {
  return (
    <Avatar className="h-8 w-8 rounded-lg">
      <AvatarImage src={src} alt={alt} />
      <AvatarFallback className="rounded-lg">{initials}</AvatarFallback>
    </Avatar>
  );
}

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

  const avatar = resolveAccountAvatar(business, user);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <SidebarMenuButton
          ref={triggerRef}
          size="lg"
          className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
        >
          <AccountAvatar {...avatar} />
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
          <AccountAvatar {...avatar} />
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

          {/* Subscription and Help & Support are hidden for the meantime.
              Neither route EXISTS — there is no `subscription/` or `help/`
              segment under `app/business/[businessId]/`, so both were links to
              a 404 sitting in the account menu. Same class as the handler-less
              "See All" and the `ProCard` that advertised billing this app does
              not have. Restore each one the day its page does.

          <DropdownMenuItem asChild>
            <Link href={bPath('subscription')}>
              <FileText className="mr-2 h-4 w-4" />
              Subscription
            </Link>
          </DropdownMenuItem> */}
        </DropdownMenuGroup>
        {/* Absent, not disabled, when the kill switch is off — a menu entry
            that opens nothing is worse than one that isn't there. The separator
            travels WITH it: with Help & Support gone this group can be empty,
            and two separators in a row read as a missing item. */}
        {tourEnabled && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onSelect={() => {
                // Deferred to `onCloseAutoFocus` above — see the note there.
                startAfterClose.current = true;
              }}
            >
              <Compass className="mr-2 h-4 w-4" />
              Replay tour
            </DropdownMenuItem>
          </>
        )}
        {/* Hidden with Subscription above — `bPath('help')` 404s.

        <DropdownMenuItem asChild>
          <Link href={bPath('help')}>
            <HelpCircle className="mr-2 h-4 w-4" />
            Help & Support
          </Link>
        </DropdownMenuItem> */}
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
