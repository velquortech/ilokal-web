'use client';

import {
  Navbar,
  NavBody,
  NavItems,
  MobileNav,
  NavbarLogo,
  NavbarButton,
  MobileNavHeader,
  MobileNavToggle,
  MobileNavMenu,
} from '@/components/ui/resizable-navbar';
import { useTheme } from 'next-themes';
import { useRouter } from 'next/navigation';
import { Sun, Moon } from 'lucide-react';
import { useState, JSX } from 'react';
import { ROUTES } from '@/config/routeConfig';

export const Navigation = (): JSX.Element => {
  const router = useRouter();
  const navItems = [
    {
      name: 'Features',
      link: '#features',
    },
    {
      name: 'Pricing',
      link: '#pricing',
    },
    {
      name: 'Contact',
      link: '#contact',
    },
  ];

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState<boolean>(false);
  const { theme, setTheme } = useTheme();

  const handleLoginClick = () => {
    router.push(ROUTES.AUTH.LOGIN);
  };

  return (
    <Navbar>
      {/* Desktop Navigation */}
      <NavBody>
        <NavbarLogo logo={null} title="iLokal" />
        <NavItems items={navItems} />
        <div className="relative z-20 flex items-center gap-4">
          <button
            className="z-50 cursor-pointer"
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          >
            {theme === 'dark' ? <Sun /> : <Moon />}
          </button>
          <NavbarButton
            as="button"
            variant="secondary"
            onClick={handleLoginClick}
          >
            Login
          </NavbarButton>
          <NavbarButton as="button" variant="primary">
            Book a call
          </NavbarButton>
        </div>
      </NavBody>

      {/* Mobile Navigation */}
      <MobileNav>
        <MobileNavHeader>
          <NavbarLogo logo={null} title="iLokal" />
          <MobileNavToggle
            isOpen={isMobileMenuOpen}
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          />
        </MobileNavHeader>

        <MobileNavMenu
          isOpen={isMobileMenuOpen}
          onClose={() => setIsMobileMenuOpen(false)}
        >
          {navItems.map((item, idx) => (
            <a
              key={`mobile-link-${idx}`}
              href={item.link}
              onClick={() => setIsMobileMenuOpen(false)}
              className="relative text-neutral-600 dark:text-neutral-300"
            >
              <span className="block">{item.name}</span>
            </a>
          ))}
          <div className="flex w-full flex-col gap-4">
            <NavbarButton
              as="button"
              onClick={() => {
                handleLoginClick();
                setIsMobileMenuOpen(false);
              }}
              variant="primary"
              className="w-full"
            >
              Login
            </NavbarButton>
            <NavbarButton
              as="button"
              onClick={() => setIsMobileMenuOpen(false)}
              variant="primary"
              className="w-full"
            >
              Book a call
            </NavbarButton>
          </div>
        </MobileNavMenu>
      </MobileNav>
    </Navbar>
  );
};
