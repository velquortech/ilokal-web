'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  Users,
  Building2,
  FileText,
  Lock,
  LogOut,
} from 'lucide-react';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [isOpen] = useState(true);

  const navItems = [
    {
      label: 'Dashboard',
      href: '/dashboard',
      icon: LayoutDashboard,
    },
    {
      label: 'Create Admin Account',
      href: '/dashboard/create-admin',
      icon: Users,
    },
    {
      label: 'Manage Accounts',
      href: '/dashboard/accounts',
      icon: Users,
    },
    {
      label: 'Business Profiles',
      href: '/dashboard/businesses',
      icon: Building2,
    },
    {
      label: 'Documents',
      href: '/dashboard/documents',
      icon: FileText,
    },
    {
      label: 'Account Status',
      href: '/dashboard/account-status',
      icon: Lock,
    },
  ];

  const handleLogout = async () => {
    router.push('/auth/login');
  };

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <div
        className={`${
          isOpen ? 'w-64' : 'w-20'
        } border-r border-gray-200 bg-white transition-all duration-300`}
      >
        <div className="border-b p-4">
          <h1
            className={`text-lg font-bold ${
              isOpen ? 'block' : 'hidden'
            } text-gray-900`}
          >
            iLokal
          </h1>
        </div>

        <nav className="space-y-2 p-4">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-3 rounded-lg px-4 py-2 transition-colors hover:bg-gray-100"
            >
              {/* {icon && icon({ className: 'h-5 w-5 text-gray-600' })} */}
              <span
                className={`${
                  isOpen ? 'block' : 'hidden'
                } text-sm text-gray-700`}
              >
                {item.label}
              </span>
            </Link>
          ))}
        </nav>

        <div className="absolute right-4 bottom-4 left-4">
          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-3 rounded-lg bg-red-50 px-4 py-2 text-red-600 transition-colors hover:bg-red-100"
          >
            <LogOut className="h-5 w-5" />
            <span className={isOpen ? 'block' : 'hidden'}>Logout</span>
          </button>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 overflow-auto">
        <div className="p-8">{children}</div>
      </div>
    </div>
  );
}
