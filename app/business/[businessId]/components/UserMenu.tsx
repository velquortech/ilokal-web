'use client';

import { useRef } from 'react';
import { LogOut, Loader2, ChevronsUpDown, Compass } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useIsMobile } from '@/hooks/use-mobile';
import { SidebarMenuButton } from '@/components/ui/sidebar';
import { BusinessVerificationBadge } from './BusinessVerificationBadge';
import { useAuth } from '@/hooks/useAuth';
import { useUser } from '@/providers/UserContext';
import { useBusinessShop } from '@/providers/BusinessProvider';
import { ROUTES } from '@/config/routeConfig';
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
            {/* The shop's verification state rides with the account — this menu
                is the account place, and the badge is the same one the header
                prints, so the two agree. */}
            <BusinessVerificationBadge
              status={business?.status}
              className="mt-1"
            />
          </div>
        </DropdownMenuLabel>
        {/* Profile and Settings no longer live here — they moved to the
            sidebar's Manage group (§6.7.2 option a); the dropdown is purely
            the account control now (identity, tour, sign-out). Subscription
            and Help & Support stay absent: neither route exists, so both were
            links to a 404 — restore each one the day its page does. */}
        {/* Absent, not disabled, when the kill switch is off — a menu entry
            that opens nothing is worse than one that isn't there. The tour's
            separator travels WITH it, so two separators never sit in a row
            (with the tour off, the identity card is followed straight by the
            sign-out divider). */}
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
