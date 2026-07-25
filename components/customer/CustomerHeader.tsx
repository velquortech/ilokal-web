'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
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
 * Home first: the landing links into /explore, and without this entry the only
 * way back out of the explore surface is the browser Back button.
 */
const NAV_LINKS = [
  { href: ROUTES.PUBLIC.LANDING, label: 'Home', icon: Home },
  { href: ROUTES.EXPLORE.HOME, label: 'Explore', icon: Compass },
  { href: ROUTES.EXPLORE.NEARBY, label: 'Nearby', icon: MapPin },
  { href: ROUTES.EXPLORE.DEALS, label: 'Deals', icon: Ticket },
];

/**
 * Shared chrome for the public /explore and protected /customer pages.
 * Anonymous visitors get login/signup doors; a signed-in customer gets
 * wallet/following + sign-out; owners/admins get a link back to their portal.
 */
export function CustomerHeader({ user }: { user: CustomerHeaderUser | null }) {
  const pathname = usePathname();
  const { logout, isLoggingOut } = useAuth();

  const isCustomer = user?.role === 'app_user';
  const initial = (user?.full_name?.trim()?.[0] ?? 'U').toUpperCase();

  // A signed-in customer's home IS the shop feed; everyone else (anonymous
  // visitor, owner, admin browsing publicly) gets the marketing landing.
  const brandHref = isCustomer ? ROUTES.EXPLORE.HOME : ROUTES.PUBLIC.LANDING;

  return (
    <header className="bg-background/85 sticky top-0 z-50 border-b backdrop-blur">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between gap-3 px-4 sm:px-6">
        <div className="flex min-w-0 items-center gap-5">
          <Link
            href={brandHref}
            aria-label={isCustomer ? 'iLokal — explore shops' : 'iLokal — home'}
          >
            <BrandLogo markSize={26} wordmarkClassName="text-lg" />
          </Link>
          <nav className="hidden items-center gap-1 md:flex">
            {NAV_LINKS.map(({ href, label, icon: Icon }) => (
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

          {!user && (
            <>
              <Button asChild variant="ghost" size="sm">
                <Link href={ROUTES.AUTH.SIGN_IN}>Log in</Link>
              </Button>
              <Button asChild size="sm">
                <Link href={ROUTES.AUTH.SIGNUP}>Sign up</Link>
              </Button>
              {/* Matches the landing's primary conversion CTA. Hidden on the
                  narrowest screens so the row can't overflow. */}
              <Button
                asChild
                variant="outline"
                size="sm"
                className="hidden sm:inline-flex"
              >
                <Link href={ROUTES.BUSINESS.registration}>
                  List Your Business
                </Link>
              </Button>
            </>
          )}

          {user && !isCustomer && (
            <Button asChild variant="outline" size="sm">
              <Link href={getDashboardRoute(user.role)}>Go to dashboard</Link>
            </Button>
          )}

          {user && isCustomer && (
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

      {/* Mobile nav row */}
      <nav className="flex items-center gap-1 overflow-x-auto px-2 pb-2 md:hidden">
        {NAV_LINKS.map(({ href, label, icon: Icon }) => (
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
        {user && isCustomer && (
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
