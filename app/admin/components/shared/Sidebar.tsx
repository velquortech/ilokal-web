'use client';

import React, { useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ROUTES } from '@/config/routeConfig';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import type { NavItem } from '@/app/admin/config/sidebarConfig';

interface SidebarProps {
  items: NavItem[];
  logoutItem?: NavItem;
  onLogout?: () => void;
  appName?: string;
  appLogo?: React.ReactNode;
  isMobileSidebarOpen?: boolean;
  setIsMobileSidebarOpen?: (value: boolean) => void;
}

export function Sidebar({
  items,
  logoutItem,
  onLogout,
  appName = 'iLokal',
  appLogo,
  isMobileSidebarOpen = false,
  setIsMobileSidebarOpen,
}: SidebarProps) {
  const [isOpen, setIsOpen] = useState(true);
  const pathname = usePathname();
  const router = useRouter();

  // Find the longest matching nav item to avoid multiple active states
  const getActiveItem = (): string | null => {
    const allItems: NavItem[] = items.filter((item) => !item.isSection);

    const matches = allItems
      .filter(
        (item) =>
          item.href &&
          (pathname === item.href || pathname.startsWith(item.href + '/')),
      )
      .sort((a, b) => (b.href?.length || 0) - (a.href?.length || 0));
    return matches[0]?.href || null;
  };

  const activeItem = getActiveItem();

  const isActive = (href?: string) => href && href === activeItem;

  const handleLogout = () => {
    if (onLogout) {
      onLogout();
    } else if (logoutItem) {
      router.push(ROUTES.AUTH.LOGIN);
    }
  };

  const renderNavItem = (item: NavItem) => {
    // Section header (group title - non-clickable)
    if (item.isSection) {
      if (!isOpen) return null;
      return (
        <div key={item.label} className="mt-6 mb-2 px-4 py-2 first:mt-0">
          <div className="flex items-center gap-2">
            {item.icon &&
              React.createElement(item.icon, {
                className: 'h-4 w-4 text-slate-400',
              })}
            <span className="text-xs font-semibold tracking-wide text-slate-400 uppercase">
              {item.label}
            </span>
          </div>
        </div>
      );
    }

    // Regular nav item
    const icon = item.icon;
    const isItemActive = isActive(item.href);

    const navButton = (
      <button
        onClick={() => {
          if (item.href) {
            router.push(item.href);
            setIsMobileSidebarOpen?.(false);
          }
        }}
        className={`group relative flex w-full items-center gap-3 rounded-lg px-3 py-2.5 transition-all duration-200 ${
          isItemActive
            ? 'bg-linear-to-r from-blue-500 to-blue-600 shadow-lg shadow-blue-500/20'
            : 'hover:bg-slate-700 active:scale-95'
        }`}
      >
        {icon &&
          React.createElement(icon, {
            className: `h-5 w-5 shrink-0 transition-colors ${
              isItemActive
                ? 'text-blue-200'
                : 'text-slate-300 group-hover:text-white'
            }`,
          })}
        {isOpen && (
          <>
            <span
              className={`flex-1 truncate text-left font-medium ${
                isItemActive ? 'text-white' : 'text-slate-200'
              }`}
            >
              {item.label}
            </span>
            {isItemActive && <div className="h-2 w-2 rounded-full bg-white" />}
          </>
        )}
      </button>
    );

    if (!isOpen) {
      return (
        <Tooltip key={item.label} delayDuration={200}>
          <TooltipTrigger asChild>{navButton}</TooltipTrigger>
          <TooltipContent
            side="right"
            className="border-slate-700 bg-slate-950 text-white"
          >
            <p className="font-medium">{item.label}</p>
            {item.description && (
              <p className="text-xs text-slate-300">{item.description}</p>
            )}
          </TooltipContent>
        </Tooltip>
      );
    }

    return <div key={item.label}>{navButton}</div>;
  };

  return (
    <TooltipProvider>
      {/* Mobile backdrop overlay */}
      {isMobileSidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={() => setIsMobileSidebarOpen?.(false)}
        />
      )}

      <aside
        className={`fixed top-0 left-0 z-50 flex h-screen flex-col bg-linear-to-b from-slate-900 to-slate-800 text-white shadow-lg transition-all duration-300 ease-in-out ${
          isOpen ? 'w-64' : 'w-20'
        } ${isMobileSidebarOpen ? 'block' : 'hidden md:block'}`}
      >
        {/* Header */}
        <div className="border-b border-slate-700 p-4">
          <div className="flex items-center justify-between">
            <div className={`flex items-center gap-3 ${!isOpen && 'hidden'}`}>
              {appLogo ? (
                appLogo
              ) : (
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-linear-to-br from-blue-400 to-blue-600">
                  <span className="text-lg font-bold">{appName[0]}</span>
                </div>
              )}
              <h1 className="text-xl font-bold tracking-tight">{appName}</h1>
            </div>

            <div className="flex items-center gap-2">
              {/* Toggle Button */}
              <button
                onClick={() => setIsOpen(!isOpen)}
                className="hidden rounded-lg p-2 transition-colors hover:bg-slate-700 active:scale-95 md:block"
                aria-label="Toggle sidebar"
              >
                {isOpen ? (
                  <ChevronLeft className="h-5 w-5" />
                ) : (
                  <ChevronRight className="h-5 w-5" />
                )}
              </button>

              {/* Mobile Close Button */}
              <button
                onClick={() => setIsMobileSidebarOpen?.(false)}
                className="rounded-lg p-2 transition-colors hover:bg-slate-700 active:scale-95 md:hidden"
                aria-label="Close sidebar"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1 overflow-y-auto p-3">
          {items.map((item) => renderNavItem(item))}
        </nav>

        {/* Logout Button */}
        {logoutItem && (
          <div className="border-t border-slate-700 p-3">
            <Button
              onClick={handleLogout}
              variant="ghost"
              className={`w-full justify-start gap-3 rounded-lg px-3 py-2.5 text-red-300 transition-colors hover:bg-red-500/20 hover:text-red-200 active:scale-95 ${
                !isOpen && 'justify-center px-0'
              }`}
            >
              <logoutItem.icon className="h-5 w-5 shrink-0" />
              {isOpen && (
                <span className="font-medium">{logoutItem.label}</span>
              )}
            </Button>
          </div>
        )}

        {/* Footer hint */}
        {!isOpen && (
          <div className="border-t border-slate-700 p-3">
            <Tooltip delayDuration={200}>
              <TooltipTrigger asChild>
                <div className="flex h-10 w-10 cursor-help items-center justify-center rounded-lg bg-slate-700">
                  <span className="text-xs font-bold">?</span>
                </div>
              </TooltipTrigger>
              <TooltipContent
                side="right"
                className="border-slate-700 bg-slate-950 text-white"
              >
                <p className="text-xs">Expand sidebar</p>
              </TooltipContent>
            </Tooltip>
          </div>
        )}
      </aside>
    </TooltipProvider>
  );
}
