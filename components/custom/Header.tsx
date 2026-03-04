'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Bell,
  Settings,
  HelpCircle,
  LogOut,
  User,
  ChevronDown,
  Moon,
  Sun,
  MessageSquare,
  Search,
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
  messageCount?: number;
}

export function Header({
  userEmail = 'user@example.com',
  userFullName = 'User Name',
  userAvatar,
  onLogout,
  showSearch = true,
  notificationCount = 0,
  messageCount = 0,
}: HeaderProps) {
  const [isDark, setIsDark] = useState(false);
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');

  const handleLogout = () => {
    if (onLogout) {
      onLogout();
    } else {
      router.push('/auth/login');
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      // You can implement global search later
      console.info('Search:', searchQuery);
    }
  };

  const initials = userFullName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <TooltipProvider>
      <header className="sticky top-0 z-40 border-b border-gray-200 bg-white shadow-sm">
        <div className="flex items-center justify-between px-8 py-4">
          {/* Left: Search Bar */}
          {showSearch && (
            <form onSubmit={handleSearch} className="max-w-md flex-1">
              <div className="relative">
                <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 bg-gray-50 py-2 pr-4 pl-10 text-sm placeholder-gray-500 transition-colors focus:border-blue-500 focus:bg-white focus:ring-1 focus:ring-blue-500 focus:outline-none"
                />
              </div>
            </form>
          )}

          {/* Right: Tools & Profile */}
          <div className="flex items-center gap-2">
            {/* Notifications */}
            <Tooltip delayDuration={200}>
              <TooltipTrigger asChild>
                <button
                  onClick={() => router.push('/dashboard/notifications')}
                  className="relative rounded-lg p-2 text-gray-600 transition-colors hover:bg-gray-100 hover:text-gray-900"
                >
                  <Bell className="h-5 w-5" />
                  {notificationCount > 0 && (
                    <span className="absolute top-0 right-0 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs font-bold text-white">
                      {notificationCount > 9 ? '9+' : notificationCount}
                    </span>
                  )}
                </button>
              </TooltipTrigger>
              <TooltipContent
                side="bottom"
                className="border-slate-700 bg-slate-950 text-white"
              >
                <p className="text-sm">Notifications</p>
              </TooltipContent>
            </Tooltip>

            {/* Messages */}
            <Tooltip delayDuration={200}>
              <TooltipTrigger asChild>
                <button
                  onClick={() => router.push('/dashboard/messages')}
                  className="relative rounded-lg p-2 text-gray-600 transition-colors hover:bg-gray-100 hover:text-gray-900"
                >
                  <MessageSquare className="h-5 w-5" />
                  {messageCount > 0 && (
                    <span className="absolute top-0 right-0 flex h-5 w-5 items-center justify-center rounded-full bg-blue-500 text-xs font-bold text-white">
                      {messageCount > 9 ? '9+' : messageCount}
                    </span>
                  )}
                </button>
              </TooltipTrigger>
              <TooltipContent
                side="bottom"
                className="border-slate-700 bg-slate-950 text-white"
              >
                <p className="text-sm">Messages</p>
              </TooltipContent>
            </Tooltip>

            {/* Help */}
            <Tooltip delayDuration={200}>
              <TooltipTrigger asChild>
                <button
                  onClick={() => router.push('/help')}
                  className="rounded-lg p-2 text-gray-600 transition-colors hover:bg-gray-100 hover:text-gray-900"
                >
                  <HelpCircle className="h-5 w-5" />
                </button>
              </TooltipTrigger>
              <TooltipContent
                side="bottom"
                className="border-slate-700 bg-slate-950 text-white"
              >
                <p className="text-sm">Help & Support</p>
              </TooltipContent>
            </Tooltip>

            {/* Settings */}
            <Tooltip delayDuration={200}>
              <TooltipTrigger asChild>
                <button
                  onClick={() => router.push('/dashboard/settings')}
                  className="rounded-lg p-2 text-gray-600 transition-colors hover:bg-gray-100 hover:text-gray-900"
                >
                  <Settings className="h-5 w-5" />
                </button>
              </TooltipTrigger>
              <TooltipContent
                side="bottom"
                className="border-slate-700 bg-slate-950 text-white"
              >
                <p className="text-sm">Settings</p>
              </TooltipContent>
            </Tooltip>

            {/* Theme Toggle */}
            <Tooltip delayDuration={200}>
              <TooltipTrigger asChild>
                <button
                  onClick={() => setIsDark(!isDark)}
                  className="rounded-lg p-2 text-gray-600 transition-colors hover:bg-gray-100 hover:text-gray-900"
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
                <button className="flex items-center gap-2 rounded-lg px-3 py-1.5 transition-colors hover:bg-gray-100">
                  {userAvatar ? (
                    <AvatarImage
                      src={userAvatar}
                      alt={userFullName}
                      width={32}
                      height={32}
                      className="h-8 w-8 rounded-full object-cover"
                    />
                  ) : (
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-linear-to-br from-blue-400 to-blue-600 text-xs font-bold text-white">
                      {initials}
                    </div>
                  )}
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
              <DropdownMenuContent align="end" className="w-56">
                <div className="px-2 py-1.5">
                  <p className="text-sm font-semibold text-gray-900">
                    {userFullName}
                  </p>
                  <p className="text-xs text-gray-500">{userEmail}</p>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => router.push('/dashboard/profile')}
                >
                  <User className="mr-2 h-4 w-4" />
                  <span>Profile</span>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => router.push('/dashboard/settings')}
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
