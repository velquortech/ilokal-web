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

import WhyRegisterCard from './components/WhyRegisterSection';
import LockedAnalyticsCard from './components/AlmosstThereSection';
import { RegistrationSteps } from './components/RegistrationSteps';

export default function BusinessHome({
  requireDocuments = true,
}: {
  requireDocuments?: boolean;
}) {
  const router = useRouter();

  const { business } = useBusinessShop();

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

      {business && (
        <>
          {/* Empty State - shown when business exists but has no data */}
          <EmptyState
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
        </>
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
