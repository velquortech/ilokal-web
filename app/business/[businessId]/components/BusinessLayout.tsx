'use client';

import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';
import { BusinessHeader, BusinessSidebar, AIChatSheet } from '.';
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
import { VerifiedCelebration } from './VerifiedCelebration';
import type { OfferingVocabulary } from '@/lib/types/offering';

export default function BusinessLayout({
  children,
  user,
  shop,
  branches = [],
  vocabulary,
  flags = {},
}: {
  children: React.ReactNode;
  user: User;
  shop?: BusinessShop | null;
  branches?: Branch[];
  vocabulary?: OfferingVocabulary | null;
  /** `app_settings` kill switches, keyed as the nav config names them. */
  flags?: Record<string, boolean>;
}) {
  return (
    <UserProvider user={user}>
      <CelebrateProvider>
        <OfferingVocabularyProvider vocabulary={vocabulary}>
          <BusinessShopProvider businessShop={shop} branches={branches}>
            <div className="bg-background flex h-screen overflow-hidden">
              <AIChatProvider>
                <SidebarProvider
                  defaultOpen={false}
                  style={
                    {
                      '--sidebar-width': '18rem',
                      '--sidebar-width-mobile': '18rem',
                    } as React.CSSProperties
                  }
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
                    <div className="flex flex-1 overflow-auto px-10 py-6">
                      {children}
                    </div>
                  </SidebarInset>
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
