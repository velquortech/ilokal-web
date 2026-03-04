'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import type { NavItem } from '@/config/sidebarConfig';

interface SidebarProps {
  items: NavItem[];
  logoutItem?: NavItem;
  onLogout?: () => void;
  appName?: string;
  appLogo?: React.ReactNode;
}

export function Sidebar({
  items,
  logoutItem,
  onLogout,
  appName = 'iLokal',
  appLogo,
}: SidebarProps) {
  const [isOpen, setIsOpen] = useState(true);
  const pathname = usePathname();
  const router = useRouter();

  // Find the longest matching nav item to avoid multiple active states
  const getActiveItem = (): string | null => {
    const matches = items
      .filter(
        (item) =>
          pathname === item.href || pathname.startsWith(item.href + '/'),
      )
      .sort((a, b) => b.href.length - a.href.length);
    return matches[0]?.href || null;
  };

  const activeItem = getActiveItem();

  const isActive = (href: string) => {
    return href === activeItem;
  };

  const handleLogout = () => {
    if (onLogout) {
      onLogout();
    } else if (logoutItem) {
      router.push('/auth/login');
    }
  };

  return (
    <TooltipProvider>
      <aside
        className={`flex flex-col bg-linear-to-b from-slate-900 to-slate-800 text-white shadow-lg transition-all duration-300 ease-in-out ${
          isOpen ? 'w-64' : 'w-20'
        }`}
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

            {/* Toggle Button */}
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="rounded-lg p-2 transition-colors hover:bg-slate-700 active:scale-95"
              aria-label="Toggle sidebar"
            >
              {isOpen ? (
                <ChevronLeft className="h-5 w-5" />
              ) : (
                <ChevronRight className="h-5 w-5" />
              )}
            </button>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1 overflow-y-auto p-3">
          {items.map((item) => {
            const active = isActive(item.href);
            const Icon = item.icon;

            const navButton = (
              <Link
                href={item.href}
                className={`group relative flex w-full items-center gap-3 rounded-lg px-3 py-2.5 transition-all duration-200 ${
                  active
                    ? 'bg-linear-to-r from-blue-500 to-blue-600 shadow-lg shadow-blue-500/20'
                    : 'hover:bg-slate-700 active:scale-95'
                }`}
              >
                <Icon
                  className={`h-5 w-5 shrink-0 transition-colors ${
                    active
                      ? 'text-blue-200'
                      : 'text-slate-300 group-hover:text-white'
                  }`}
                />
                {isOpen && (
                  <span
                    className={`truncate font-medium ${active ? 'text-white' : 'text-slate-200'}`}
                  >
                    {item.label}
                  </span>
                )}
                {isOpen && active && (
                  <div className="ml-auto h-2 w-2 rounded-full bg-white" />
                )}
              </Link>
            );

            if (!isOpen) {
              return (
                <Tooltip key={item.href} delayDuration={200}>
                  <TooltipTrigger asChild>{navButton}</TooltipTrigger>
                  <TooltipContent
                    side="right"
                    className="border-slate-700 bg-slate-950 text-white"
                  >
                    <p className="font-medium">{item.label}</p>
                    {item.description && (
                      <p className="text-xs text-slate-300">
                        {item.description}
                      </p>
                    )}
                  </TooltipContent>
                </Tooltip>
              );
            }

            return <div key={item.href}>{navButton}</div>;
          })}
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
