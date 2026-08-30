'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { BadgeCheck, Home, Menu, ShoppingBasket } from 'lucide-react';
import { cn } from '@/lib/utils';
import { businessPath } from '@/config/routeConfig';
import { useSidebar } from '@/components/ui/sidebar';
import { useOfferingVocabulary } from '@/providers/OfferingVocabularyProvider';
import { useBusinessShop } from '@/providers/BusinessProvider';

/**
 * The installed app's primary navigation on a small screen.
 *
 * Four thumb targets, chosen by how often an owner actually goes there on a
 * phone rather than by how the nav is organised — a tab bar is a frequency
 * ranking, not a taxonomy:
 *
 *  · **Home** — the only page opened with no goal in mind.
 *  · **Offerings** — the most-edited surface: prices, availability, photos.
 *  · **Redeem** — the reason this exists. It is the one page performed
 *    standing at a counter with a customer waiting. On a desktop it is a
 *    report; on a phone it is the app's most native action.
 *  · **More** — opens the sidebar sheet.
 *
 * 🔴 "More" opens the sheet that ALREADY EXISTS rather than carrying its own
 * menu. `BusinessSidebar` renders `SIDEBAR_SECTIONS`, filters on the feature
 * flags, and owns the search and the account footer; a second hand-written
 * list would be a fork of the nav config, and this repo has paid for that kind
 * of fork four times over in the table components. One config, two
 * presentations.
 *
 * It also means the flag-gated Events entry costs nothing here: it lives
 * inside the sheet and appears or disappears there. A tab bar whose tabs come
 * and go would be far worse, and this grouping avoids it by construction.
 *
 * Visibility is CSS-only — `standalone:` (see `globals.css`) plus `md:hidden`.
 * The component is always in the server HTML; the browser decides whether it
 * paints. Nothing here reads `navigator` or `matchMedia`.
 */
export function BusinessTabBar() {
  const pathname = usePathname();
  const vocabulary = useOfferingVocabulary();
  const { business } = useBusinessShop();
  const { openMobile, setOpenMobile } = useSidebar();

  const id = business?.id;
  // Without a shop there is nowhere to go — the registration wizard owns that
  // state and has its own chrome.
  if (!id) return null;

  const home = businessPath(id);
  const offerings = businessPath(id, 'product-catalogues');
  const redeem = businessPath(id, 'redeemed-coupons');

  const tabs = [
    { href: home, label: 'Home', icon: Home, exact: true },
    {
      href: offerings,
      // A salon reads "Services". The provider is already above this in the
      // tree, and a tab reading "Products" there is the exact defect the
      // vocabulary system exists to prevent.
      label: vocabulary.plural,
      icon: ShoppingBasket,
      exact: false,
    },
    { href: redeem, label: 'Redeem', icon: BadgeCheck, exact: false },
  ];

  return (
    <nav
      aria-label="Primary"
      className={cn(
        'bg-background fixed inset-x-0 bottom-0 z-40 border-t',
        // The home indicator on an iPhone sits over the bottom edge; without
        // this the last few pixels of every tab are under it.
        'pb-[env(safe-area-inset-bottom)]',
        // Installed app, small screens only. Everywhere else the sidebar is
        // still the navigation and this must not paint.
        'standalone:flex standalone:md:hidden hidden',
      )}
    >
      {tabs.map(({ href, label, icon: Icon, exact }) => {
        const active = exact
          ? pathname === href
          : pathname === href || pathname.startsWith(`${href}/`);

        return (
          <Link
            key={href}
            href={href}
            // Colour alone cannot carry the active state — four icons that
            // differ only by tint are unusable for anyone who cannot separate
            // them, and this is what a screen reader announces.
            aria-current={active ? 'page' : undefined}
            className={cn(
              // The whole cell is the target, not the icon: 44px minimum, and
              // in practice a quarter of the viewport width.
              'flex min-h-14 flex-1 flex-col items-center justify-center gap-1',
              'text-[11px] leading-none font-medium',
              'focus-visible:ring-ring focus-visible:ring-2 focus-visible:outline-hidden',
              active ? 'text-primary' : 'text-muted-foreground',
            )}
          >
            <Icon className="size-5 shrink-0" aria-hidden="true" />
            {/* Labels are never hidden. Four unlabelled glyphs are a memory
                test, and "Redeem" has no widely-known icon convention. */}
            <span className="max-w-full truncate px-1">{label}</span>
          </Link>
        );
      })}

      {/* A disclosure, not a destination — so it is a button with
          `aria-expanded`, and it toggles rather than navigating. */}
      <button
        type="button"
        onClick={() => setOpenMobile(!openMobile)}
        aria-expanded={openMobile}
        // No `aria-controls`: the sheet is rendered by the shared `Sidebar`
        // primitive, which spreads its props onto the Radix ROOT rather than
        // the content, so there is no id here to point at. A dangling
        // `aria-controls` announces a relationship that does not resolve,
        // which is worse than omitting it — `aria-expanded` alone is a
        // complete disclosure contract.
        className={cn(
          'flex min-h-14 flex-1 flex-col items-center justify-center gap-1',
          'text-[11px] leading-none font-medium',
          'focus-visible:ring-ring focus-visible:ring-2 focus-visible:outline-hidden',
          openMobile ? 'text-primary' : 'text-muted-foreground',
        )}
      >
        <Menu className="size-5 shrink-0" aria-hidden="true" />
        <span>More</span>
      </button>
    </nav>
  );
}
