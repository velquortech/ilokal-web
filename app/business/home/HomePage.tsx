'use client';

import { useRouter } from 'next/navigation';
import { useDashboardTour } from '@/app/business/hooks/useDashboardTour';
import { OnboardingSection, EmptyState } from './components';
import { TOUR_FEATURES } from './lib';
import { TourDialog } from './components/TourDialog';
import { ROUTES } from '@/config/routeConfig';
import { useBusinessShop } from '@/providers/BusinessProvider';

import WhyRegisterCard from './components/WhyRegisterSection';
import LockedAnalyticsCard from './components/AlmosstThereSection';
import { RegistrationSteps } from './components/RegistrationSteps';

export default function BusinessHome() {
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
    <div className="h-max flex-1 space-y-6">
      {!business && (
        <>
          <OnboardingSection onStartTour={openTour} />
          <div className="grid h-max grid-cols-2 gap-6">
            <RegistrationSteps />
            <WhyRegisterCard />
          </div>
          <LockedAnalyticsCard />
        </>
      )}

      {business && (
        <>
          {/* Empty State - shown when business exists but has no data */}
          <EmptyState
            onAddProduct={() => router.push('/business/product-catalogues')}
            onViewOrders={() => router.push('/business/shop')}
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
      />
    </div>
  );
}
