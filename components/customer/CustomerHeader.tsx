'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  CalendarClock,
  CalendarDays,
  Compass,
  Home,
  Loader2,
  LogOut,
  MapPin,
  Ticket,
  UserRound,
  Wallet,
} from 'lucide-react';
import { BrandLogo } from '@/components/custom/BrandLogo';
import { ThemeToggle } from '@/components/custom/ThemeTogge';
import { PublicNav } from '@/components/customer/PublicNav';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';
import { ROUTES, getDashboardRoute } from '@/config/routeConfig';

export interface CustomerHeaderUser {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  role: string;
}

/**
 * App nav, shown once there's a session. Anonymous visitors get the landing's
 * own nav instead — see `PublicNav`.
 */
const NAV_LINKS: Array<{
  href: string;
  label: string;
  icon: typeof Home;
  /** The `app_settings` kill switch this entry needs, if any. */
  flag?: string;
}> = [
  { href: ROUTES.PUBLIC.LANDING, label: 'Home', icon: Home },
  { href: ROUTES.EXPLORE.HOME, label: 'Explore', icon: Compass },
  { href: ROUTES.EXPLORE.NEARBY, label: 'Nearby', icon: MapPin },
  { href: ROUTES.EXPLORE.DEALS, label: 'Deals', icon: Ticket },
  {
    href: ROUTES.EVENTS.HOME,
    label: 'Events',
    icon: CalendarDays,
    flag: 'enable_events',
  },
];

/**
 * Chrome for the public /explore and protected /customer pages.
 *
 * The whole header branches on the session. With no session the surface is
 * still marketing, so it renders the LANDING's own nav (`PublicNav`) — same
 * component, same look, so the two public surfaces are not two designs. Once
 * there is a session this app header takes over: customers get
 * wallet/following + sign-out, owners/admins a link back to their portal.
 */
export function CustomerHeader({
  user,
  flags = {},
}: {
  user: CustomerHeaderUser | null;
  /**
   * `app_settings` kill switches, resolved server-side by the layout. One
   * record rather than a boolean per feature: a flagged route 404s while its
   * flag is off, so every entry needs the same filter and adding the third
   * feature should not change this signature again.
   */
  flags?: Record<string, boolean>;
}) {
  const pathname = usePathname();
  const { logout, isLoggingOut } = useAuth();

  // A flagged route 404s while its flag is off, so the nav must not advertise
  // it. Both breakpoint rows read this one list.
  const navLinks = NAV_LINKS.filter(
    (link) => !link.flag || flags[link.flag] === true,
  );

  const isCustomer = user?.role === 'app_user';
  const initial = (user?.full_name?.trim()?.[0] ?? 'U').toUpperCase();

  if (!user) return <PublicNav />;

  // A signed-in customer's home IS the shop feed; an owner/admin browsing
  // publicly gets the marketing landing.
  const brandHref = isCustomer ? ROUTES.EXPLORE.HOME : ROUTES.PUBLIC.LANDING;

  return (
    <header className="bg-background/85 sticky top-0 z-50 border-b backdrop-blur">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between gap-3 px-4 sm:px-6">
        <div className="flex items-center gap-5">
          <Link
            href={brandHref}
            // `flex` on purpose: as an inline anchor its flex-item box is a
            // LINE box, so the inherited line-height strut pads the 28px
            // lockup and `items-center` centres that taller box instead of the
            // logo — the mark rode a couple px above the nav row.
            className="flex shrink-0 items-center"
            aria-label={isCustomer ? 'iLokal — explore shops' : 'iLokal — home'}
          >
            <BrandLogo markSize={26} eager wordmarkClassName="text-lg" />
          </Link>
          <nav className="hidden items-center gap-1 md:flex">
            {navLinks.map(({ href, label, icon: Icon }) => (
              <Button
                key={href}
                asChild
                variant="ghost"
                size="sm"
                className={cn(
                  'text-muted-foreground',
                  pathname === href && 'text-foreground bg-accent',
                )}
              >
                <Link href={href}>
                  <Icon className="h-4 w-4" />
                  {label}
                </Link>
              </Button>
            ))}
          </nav>
        </div>

        <div className="flex items-center gap-2">
          {/* Unlike the landing's page-local toggle, this one is real
              next-themes and persists across navigation. */}
          <ThemeToggle />

          {!isCustomer && (
            <Button asChild variant="outline" size="sm">
              <Link href={getDashboardRoute(user.role)}>Go to dashboard</Link>
            </Button>
          )}

          {isCustomer && (
            <>
              <Button
                asChild
                variant="ghost"
                size="sm"
                className={cn(
                  'text-muted-foreground hidden sm:inline-flex',
                  pathname.startsWith(ROUTES.CUSTOMER.WALLET) &&
                    'text-foreground bg-accent',
                )}
              >
                <Link href={ROUTES.CUSTOMER.WALLET}>
                  <Wallet className="h-4 w-4" />
                  Wallet
                </Link>
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    aria-label="Account menu"
                    className="focus-visible:ring-ring rounded-full focus-visible:ring-2 focus-visible:outline-none"
                  >
                    <Avatar className="size-8">
                      {user.avatar_url && (
                        <AvatarImage
                          src={user.avatar_url}
                          alt={user.full_name ?? 'Account'}
                        />
                      )}
                      <AvatarFallback>{initial}</AvatarFallback>
                    </Avatar>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-52">
                  <DropdownMenuLabel className="truncate">
                    {user.full_name ?? 'My account'}
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link href={ROUTES.CUSTOMER.WALLET}>
                      <Wallet className="h-4 w-4" />
                      My wallet
                    </Link>
                  </DropdownMenuItem>
                  {/* Only rendered when bookings are switched on — the route
                      404s while the flag is off, so advertising it would be a
                      dead end. */}
                  {flags.enable_bookings && (
                    <DropdownMenuItem asChild>
                      <Link href={ROUTES.CUSTOMER.BOOKINGS}>
                        <CalendarClock className="h-4 w-4" />
                        My bookings
                      </Link>
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem asChild>
                    <Link href={ROUTES.CUSTOMER.FOLLOWING}>
                      <UserRound className="h-4 w-4" />
                      Following
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    disabled={isLoggingOut}
                    onSelect={(e) => {
                      e.preventDefault();
                      logout(ROUTES.AUTH.SIGN_IN);
                    }}
                  >
                    {isLoggingOut ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Signing out…
                      </>
                    ) : (
                      <>
                        <LogOut className="h-4 w-4" />
                        Log out
                      </>
                    )}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          )}
        </div>
      </div>

      {/* Narrow-viewport row — same set as the inline row above, at the
          complementary breakpoint, so exactly one of the two is ever on. */}
      <nav className="flex items-center gap-1 overflow-x-auto px-2 pb-2 md:hidden">
        {navLinks.map(({ href, label, icon: Icon }) => (
          <Button
            key={href}
            asChild
            variant="ghost"
            size="sm"
            className={cn(
              'text-muted-foreground shrink-0',
              pathname === href && 'text-foreground bg-accent',
            )}
          >
            <Link href={href}>
              <Icon className="h-4 w-4" />
              {label}
            </Link>
          </Button>
        ))}
        {isCustomer && (
          <Button
            asChild
            variant="ghost"
            size="sm"
            className={cn(
              'text-muted-foreground shrink-0',
              pathname.startsWith(ROUTES.CUSTOMER.WALLET) &&
                'text-foreground bg-accent',
            )}
          >
            <Link href={ROUTES.CUSTOMER.WALLET}>
              <Wallet className="h-4 w-4" />
              Wallet
            </Link>
          </Button>
        )}
      </nav>
    </header>
  );
}
