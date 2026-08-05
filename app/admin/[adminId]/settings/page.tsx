import {
  getRegistrationSettings,
  getBookingsEnabled,
  getEventsEnabled,
  getOnboardingTourEnabled,
} from '@/lib/api/appSettings';
import { RegistrationSettingsCard } from './components/registration-settings-card';
import { FeatureFlagsCard } from './components/feature-flags-card';

export const dynamic = 'force-dynamic';

/**
 * Platform settings. Admin-managed feature flags — the two
 * business-registration gates, plus the dark-shipped features.
 */
export default async function AdminSettingsPage() {
  const [settings, bookingsEnabled, eventsEnabled, onboardingTourEnabled] =
    await Promise.all([
      getRegistrationSettings(),
      getBookingsEnabled(),
      getEventsEnabled(),
      getOnboardingTourEnabled(),
    ]);

  return (
    <div className="flex flex-1 flex-col space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Platform Settings
        </h1>
        <p className="text-muted-foreground text-sm">
          Feature flags that control how businesses join the platform and what
          the app exposes.
        </p>
      </div>
      <FeatureFlagsCard
        initial={{
          enable_events: eventsEnabled,
          enable_bookings: bookingsEnabled,
          enable_onboarding_tour: onboardingTourEnabled,
          // Present so the record is total; the registration card owns these.
          require_business_documents: settings.requireBusinessDocuments,
          auto_verify_businesses: settings.autoVerifyBusinesses,
        }}
      />
      <RegistrationSettingsCard initialSettings={settings} />
    </div>
  );
}
