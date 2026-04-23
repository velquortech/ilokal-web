'use client';

import { useRouter } from 'next/navigation';
import { useDashboardTour } from '@/app/business/hooks/useDashboardTour';
import {
  OnboardingSection,
  StatsOverview,
  RevenueOverview,
  CategoryDistribution,
  WeeklyPerformance,
  RecentOrders,
  TopProducts,
  QuickInsights,
} from './components';
import {
  SALES_DATA,
  TOUR_FEATURES,
  calculateDashboardMetrics,
  getStatMetrics,
} from './lib';
import { TourDialog } from './components/TourDialog';
import { ROUTES } from '@/config/routeConfig';
import { useBusinessShop } from '@/providers/BusinessProvider';

export default function BusinessHome() {
  const router = useRouter();
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

  const metrics = calculateDashboardMetrics(SALES_DATA);
  const statMetrics = getStatMetrics(metrics);

  const { business } = useBusinessShop();

  return (
    <div className="h-max flex-1 space-y-6">
      {!business && <OnboardingSection onStartTour={openTour} />}

      <StatsOverview metrics={statMetrics} />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <RevenueOverview />
        <CategoryDistribution />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <WeeklyPerformance />
        <RecentOrders onViewAll={() => router.push('/business/orders')} />
      </div>

      <QuickInsights />

      <TopProducts onViewAll={() => router.push('/business/products')} />

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
