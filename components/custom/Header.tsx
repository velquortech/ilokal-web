'use client';

import React, {
  useState,
  useCallback,
  useMemo,
  useEffect,
  useRef,
} from 'react';
import { useRouter } from 'next/navigation';
import {
  Bell,
  Settings,
  LogOut,
  User,
  ChevronDown,
  Moon,
  Sun,
  Menu,
  LucideIcon,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { AvatarImage } from '@/components/custom/AvatarImage';

interface HeaderProps {
  userEmail?: string;
  userFullName?: string;
  userAvatar?: string;
  onLogout?: () => void;
  showSearch?: boolean;
  notificationCount?: number;
  onMobileMenuClick?: () => void;
}

interface IconButtonConfig {
  icon: LucideIcon;
  tooltip: string;
  action: () => void;
  badge?: number;
  ariaLabel: string;
}

/**
 * Reusable icon button with tooltip and optional badge
 */
function HeaderIconButton({
  icon: Icon,
  tooltip,
  action,
  badge,
  ariaLabel,
}: IconButtonConfig) {
  const showBadge = badge !== undefined && badge > 0;

  return (
    <Tooltip delayDuration={200}>
      <TooltipTrigger asChild>
        <button
          onClick={action}
          className="relative rounded-lg p-2 text-gray-600 transition-colors hover:bg-gray-100 hover:text-gray-900"
          aria-label={ariaLabel}
        >
          <Icon className="h-5 w-5" />
          {showBadge && (
            <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs font-bold text-white">
              {badge > 9 ? '9+' : badge}
            </span>
          )}
        </button>
      </TooltipTrigger>
      <TooltipContent
        side="bottom"
        className="border-slate-700 bg-slate-950 text-white"
      >
        <p className="text-sm">{tooltip}</p>
      </TooltipContent>
    </Tooltip>
  );
}

/**
 * User avatar component
 */
function UserAvatar({
  src,
  alt,
  initials,
}: {
  src?: string;
  alt: string;
  initials: string;
}) {
  if (src) {
    return (
      <AvatarImage
        src={src}
        alt={alt}
        width={32}
        height={32}
        className="h-8 w-8 rounded-full object-cover"
      />
    );
  }

  return (
    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-linear-to-br from-blue-400 to-blue-600 text-xs font-bold text-white">
      {initials}
    </div>
  );
}

export function Header({
  userEmail = 'user@example.com',
  userFullName = 'User Name',
  userAvatar,
  onLogout,
  onMobileMenuClick,
  notificationCount = 0,
}: HeaderProps) {
  const [isDark, setIsDark] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
  const lastScrollY = useRef(0);
  const router = useRouter();

  // Memoize initials calculation
  const initials = useMemo(
    () =>
      userFullName
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2),
    [userFullName],
  );

  // Handle logout with callback
  const handleLogout = useCallback(() => {
    if (onLogout) {
      onLogout();
    } else {
      router.push('/auth/login');
    }
  }, [onLogout, router]);

  // Handle scroll visibility
  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;

      if (currentScrollY > lastScrollY.current && currentScrollY > 100) {
        // Scrolling down and past 100px
        setIsVisible(false);
      } else {
        // Scrolling up or near top
        setIsVisible(true);
      }

      lastScrollY.current = currentScrollY;
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Navigation helper
  const navigateTo = useCallback(
    (path: string) => {
      router.push(path);
    },
    [router],
  );

  // Icon button configurations
  const iconButtons: IconButtonConfig[] = useMemo(
    () => [
      {
        icon: Bell,
        tooltip: 'Notifications',
        action: () => navigateTo('/dashboard/notifications'),
        badge: notificationCount,
        ariaLabel: 'View notifications',
      },
    ],
    [notificationCount, navigateTo],
  );

  return (
    <TooltipProvider>
      <header
        className={`fixed top-6 right-6 z-40 rounded-lg border border-gray-200 bg-white shadow-lg transition-all duration-300 ease-in-out ${
          isVisible
            ? 'translate-y-0 opacity-100'
            : 'pointer-events-none -translate-y-4 opacity-0'
        }`}
      >
        <div className="flex items-center justify-end px-4 py-3">
          {/* Right: Tools & Profile */}
          <div className="flex items-center gap-2">
            {/* Mobile Menu Button */}
            <Tooltip delayDuration={200}>
              <TooltipTrigger asChild>
                <button
                  onClick={onMobileMenuClick}
                  className="rounded-lg p-2 text-gray-600 transition-colors hover:bg-gray-100 hover:text-gray-900 md:hidden"
                  aria-label="Toggle mobile menu"
                >
                  <Menu className="h-5 w-5" />
                </button>
              </TooltipTrigger>
              <TooltipContent
                side="bottom"
                className="border-slate-700 bg-slate-950 text-white"
              >
                <p className="text-sm">Toggle menu</p>
              </TooltipContent>
            </Tooltip>

            {/* Dynamic Icon Buttons */}
            {iconButtons.map((button) => (
              <HeaderIconButton key={button.ariaLabel} {...button} />
            ))}

            {/* Theme Toggle */}
            <Tooltip delayDuration={200}>
              <TooltipTrigger asChild>
                <button
                  onClick={() => setIsDark(!isDark)}
                  className="rounded-lg p-2 text-gray-600 transition-colors hover:bg-gray-100 hover:text-gray-900"
                  aria-label="Toggle dark mode"
                >
                  {isDark ? (
                    <Sun className="h-5 w-5" />
                  ) : (
                    <Moon className="h-5 w-5" />
                  )}
                </button>
              </TooltipTrigger>
              <TooltipContent
                side="bottom"
                className="border-slate-700 bg-slate-950 text-white"
              >
                <p className="text-sm">Toggle theme</p>
              </TooltipContent>
            </Tooltip>

            {/* Divider */}
            <div className="h-6 w-px bg-gray-200" />

            {/* Profile Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  className="flex items-center gap-2 rounded-lg px-3 py-1.5 transition-colors hover:bg-gray-100"
                  aria-label="User menu"
                >
                  <UserAvatar
                    src={userAvatar}
                    alt={userFullName}
                    initials={initials}
                  />
                  <div className="hidden text-left sm:block">
                    <p className="max-w-30 truncate text-sm font-medium text-gray-900">
                      {userFullName}
                    </p>
                    <p className="max-w-30 truncate text-xs text-gray-500">
                      {userEmail}
                    </p>
                  </div>
                  <ChevronDown className="h-4 w-4 text-gray-600" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-44">
                <DropdownMenuItem
                  onClick={() => navigateTo('/dashboard/profile')}
                >
                  <User className="mr-2 h-4 w-4" />
                  <span>Profile</span>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => navigateTo('/dashboard/settings')}
                >
                  <Settings className="mr-2 h-4 w-4" />
                  <span>Settings</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={handleLogout}
                  className="text-red-600"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Logout</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>
    </TooltipProvider>
  );
}
