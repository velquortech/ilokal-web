import {
  getRegistrationSettings,
  getEventsEnabled,
  getOnboardingTourEnabled,
} from '@/lib/api/appSettings';
import { RegistrationSettingsCard } from './components/registration-settings-card';
import { FeatureFlagsCard } from './components/feature-flags-card';
import { PageHeader } from '@/components/custom/PageHeader';

export const dynamic = 'force-dynamic';

/**
 * Platform settings. Admin-managed feature flags — the two
 * business-registration gates, plus the dark-shipped features.
 */
export default async function AdminSettingsPage() {
  const [settings, eventsEnabled, onboardingTourEnabled] = await Promise.all([
    getRegistrationSettings(),
    getEventsEnabled(),
    getOnboardingTourEnabled(),
  ]);

  return (
    <div className="flex flex-1 flex-col space-y-6">
      <PageHeader
        title="Platform Settings"
        lede="Feature flags that control how businesses join the platform and what the app exposes."
      />
      <FeatureFlagsCard
        initial={{
          enable_events: eventsEnabled,
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
