'use client';

import { useRouter } from 'next/navigation';
import { useDashboardTour } from '../hooks/useDashboardTour';
import { OnboardingSection, EmptyState } from './components';
import { TOUR_FEATURES } from './lib';
import { TourDialog } from './components/TourDialog';
import {
  ROUTES,
  businessShopPath,
  businessProductCataloguesPath,
} from '@/config/routeConfig';
import { useBusinessShop } from '@/providers/BusinessProvider';
import { useOfferingVocabulary } from '@/providers/OfferingVocabularyProvider';
import { Card, CardContent } from '@/components/ui/card';
import { Lock } from 'lucide-react';

import WhyRegisterCard from './components/WhyRegisterSection';
import LockedAnalyticsCard from './components/AlmosstThereSection';
import { RegistrationSteps } from './components/RegistrationSteps';

export default function BusinessHome({
  requireDocuments = true,
  hasOfferings,
}: {
  requireDocuments?: boolean;
  /**
   * Derived by the page from the same read that builds the setup checklist.
   * Without it this component rendered `EmptyState` for ANY existing business
   * — so a shop with 200 offerings was told "No products yet. Your shop
   * dashboard is empty." Nothing here ever counted them.
   *
   * **`undefined` means the count is UNKNOWN** (the read failed), which is not
   * the same as zero. Defaulting it to `false` put "No products yet" beside the
   * checklist's own "we couldn't load" card on every outage — the same lie one
   * component down. Neither branch below renders while it is undefined.
   */
  hasOfferings?: boolean;
}) {
  const router = useRouter();

  const { business } = useBusinessShop();
  const vocabulary = useOfferingVocabulary();

  const {
    isOpen: showTour,
    openTour,
    dismissTour,
  } = useDashboardTour({
    storageKey: 'hasSeenShopTour',
    delay: 800,
  });

  const handleStartRegistration = () => {
    dismissTour();
    router.push(ROUTES.BUSINESS.registration);
  };

  return (
    <div className="flex flex-1 flex-col space-y-6">
      {!business && (
        <>
          <OnboardingSection onStartTour={openTour} />
          <div className="grid h-max grid-cols-2 gap-6">
            <RegistrationSteps requireDocuments={requireDocuments} />
            <WhyRegisterCard />
          </div>
          <LockedAnalyticsCard />
        </>
      )}

      {/* Only when the shop genuinely has nothing — `=== false`, not falsy, so
          an unknown count (failed read) renders neither this nor the card
          below. This used to render for ANY existing business, so a shop with
          200 offerings read "No products yet". */}
      {business && hasOfferings === false && (
        <EmptyState
          emptyLabel={vocabulary.emptyLabel}
          addLabel={vocabulary.addLabel}
          onAddProduct={() =>
            router.push(
              business?.id
                ? businessProductCataloguesPath(business.id)
                : ROUTES.BUSINESS.home,
            )
          }
          onViewOrders={() =>
            router.push(
              business?.id
                ? businessShopPath(business.id)
                : ROUTES.BUSINESS.home,
            )
          }
        />
      )}

      {/* Shop has offerings but is not verified, so the analytics page it would
          otherwise show has nothing to display. Say why rather than leaving a
          blank column — the layout's pending banner covers the visibility side. */}
      {business && hasOfferings === true && (
        <Card className="border-dashed">
          <CardContent className="flex items-center gap-3 py-6">
            <Lock className="text-muted-foreground h-5 w-5 shrink-0" />
            <div>
              <p className="text-sm font-medium">
                Analytics unlock once your shop is verified
              </p>
              <p className="text-muted-foreground text-sm">
                Everything else — {vocabulary.plural.toLowerCase()}, deals,
                branches — you can keep working on now.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      <TourDialog
        isOpen={showTour}
        onClose={dismissTour}
        onStart={handleStartRegistration}
        title="Welcome to iLokal Business!"
        description="Transform your local business with our powerful e-commerce platform. Register your shop to get started."
        features={TOUR_FEATURES}
        requireDocuments={requireDocuments}
      />
    </div>
  );
}
