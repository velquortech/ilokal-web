'use client';

import { cn } from '@/lib/utils';

import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';
import { BusinessHeader, BusinessSidebar, AIChatSheet } from '.';
import { BusinessTabBar } from './BusinessTabBar';
import { AIChatProvider } from './AIChatSheet';
import { Branch, User } from '@/lib/types';
import { UserProvider } from '@/providers/UserContext';
import {
  BusinessShop,
  BusinessShopProvider,
} from '@/providers/BusinessProvider';
import { ShopPendingBanner } from '../home/components/PendingBanner';
import { ActiveBranchBanner } from './ActiveBranchBanner';
import { OfferingVocabularyProvider } from '@/providers/OfferingVocabularyProvider';
import { CelebrateProvider } from '@/components/custom/Celebrate';
import { OnboardingTourProvider } from '@/components/custom/onboarding/OnboardingTourProvider';
import { VerifiedCelebration } from './VerifiedCelebration';
import type { OfferingVocabulary } from '@/lib/types/offering';

export default function BusinessLayout({
  children,
  user,
  shop,
  branches = [],
  vocabulary,
  flags = {},
  sidebarDefaultOpen = true,
  tourCompleted = false,
}: {
  children: React.ReactNode;
  user: User;
  shop?: BusinessShop | null;
  branches?: Branch[];
  vocabulary?: OfferingVocabulary | null;
  /**
   * Seeded from the `sidebar_state` cookie by the server layout. Open unless
   * the owner collapsed it — nav they can read beats nav they must decode.
   */
  sidebarDefaultOpen?: boolean;
  /** `app_settings` kill switches, keyed as the nav config names them. */
  flags?: Record<string, boolean>;
  /** Stored answer to the guided tour — per shop, not per device. */
  tourCompleted?: boolean;
}) {
  return (
    <UserProvider user={user}>
      <CelebrateProvider>
        <OfferingVocabularyProvider vocabulary={vocabulary}>
          <BusinessShopProvider businessShop={shop} branches={branches}>
            {/* `h-dvh`, not `h-screen`: 100vh is taller than the visible
                viewport on a phone while the browser URL bar is showing, so
                with the shell's `overflow-hidden` the bottom of the app (e.g.
                the branch wizard's Back/Next bar) sits behind the browser
                chrome — unreachable on browsers whose URL bar never collapses
                (embedded webviews). dvh tracks the dynamic viewport instead;
                identical to vh on desktop. Same migration the registration
                wizard's own layout made. */}
            <div className="bg-background flex h-dvh overflow-hidden">
              <AIChatProvider>
                <SidebarProvider
                  defaultOpen={sidebarDefaultOpen}
                  style={
                    {
                      '--sidebar-width': '18rem',
                      '--sidebar-width-mobile': '18rem',
                    } as React.CSSProperties
                  }
                >
                  {/* Inside `SidebarProvider` (the tour opens the sidebar) and
                      wrapping BOTH halves, because the sidebar's user menu and
                      the content's setup card are both entry points. */}
                  <OnboardingTourProvider
                    businessId={shop?.id}
                    enabled={flags.enable_onboarding_tour === true}
                    flags={flags}
                    tourCompleted={tourCompleted}
                  >
                    <BusinessSidebar flags={flags} />
                    <SidebarInset className="flex flex-1 flex-col overflow-hidden">
                      <BusinessHeader branches={branches} />
                      <VerifiedCelebration
                        businessId={shop?.id}
                        status={shop?.status}
                      />
                      <ActiveBranchBanner branches={branches} />
                      {shop?.status === 'pending' && (
                        <div className="px-3 pt-3 pb-1">
                          <ShopPendingBanner />
                        </div>
                      )}
                      <div
                        className={cn(
                          'flex flex-1 overflow-auto px-4 py-6 sm:px-6 lg:px-10',
                          // Room for the tab bar, under the same condition
                          // that paints it — otherwise the last row of every
                          // table sits underneath it. The bar is `min-h-14`
                          // plus the home-indicator inset.
                          'standalone:pb-[calc(3.5rem+env(safe-area-inset-bottom)+1.5rem)]',
                          'standalone:md:pb-6',
                        )}
                      >
                        {children}
                      </div>
                      {/* Installed-app navigation. Always in the HTML; CSS
                          decides whether it paints (see `globals.css`). */}
                      <BusinessTabBar />
                    </SidebarInset>
                  </OnboardingTourProvider>
                </SidebarProvider>
                <AIChatSheet />
              </AIChatProvider>
            </div>
          </BusinessShopProvider>
        </OfferingVocabularyProvider>
      </CelebrateProvider>
    </UserProvider>
  );
}
