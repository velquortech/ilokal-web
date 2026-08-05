import { cache } from 'react';
import { createServerSupabaseClient } from '@/supabase/server';
import { describeDbError } from '@/lib/utils/describeDbError';
import {
  businessProfilePath,
  businessBranchesPath,
  businessSettingsPath,
  businessProductCataloguesPath,
  businessCouponsPath,
} from '@/config/routeConfig';
import type { OfferingVocabulary } from '@/lib/types/offering';
import type {
  OnboardingItem,
  OnboardingProgress,
  OnboardingState,
} from '@/lib/types/onboarding';
import {
  EMPTY_ONBOARDING_PROGRESS,
  EMPTY_ONBOARDING_STATE,
} from '@/lib/types/onboarding';
import type { BusinessVerificationStatus } from '@/lib/types/business';

/**
 * The verification row's copy, one entry per status.
 *
 * A `Record` over the union rather than nested ternaries, so a new status is a
 * compile error instead of silently falling into the else branch — which is how
 * a **suspended** shop came to be told "Verification in review… Nothing to do"
 * (CLAUDE.md §DRY: extend the map, don't branch beside it).
 */
const VERIFICATION_COPY: Record<
  BusinessVerificationStatus,
  { label: string; detail: string }
> = {
  verified: {
    label: 'Shop verified',
    detail: 'Your shop is visible to shoppers.',
  },
  pending: {
    label: 'Verification in review',
    detail: 'Nothing to do — everything above can be done while you wait.',
  },
  rejected: {
    label: 'Verification needs attention',
    detail: 'Check the reason and resubmit your documents.',
  },
  suspended: {
    label: 'Shop suspended',
    detail: 'An admin has suspended this shop. Contact support to resolve it.',
  },
};

/**
 * The post-registration setup checklist, derived in full.
 *
 * Counts are head-only (`select('id', { count: 'exact', head: true })`) — never
 * `select(...)` then `.length`, which the PostgREST 1000-row cap turns into a
 * wrong number the moment a shop is busy (CLAUDE.md §API standards).
 *
 * A failed read reports `failed: true` and the card says "couldn't load". Six
 * unchecked boxes and an outage look identical otherwise, and an unchecked box
 * tells the owner to redo work they already did — the `getBookingStats` /
 * `getEventStats` lesson.
 *
 * NOT flag-filtered: every item here is part of being *sellable* (profile,
 * branch, hours, offering, promo), and none of them lives behind a kill
 * switch. Growth surfaces that DO — events, bookings — are deliberately absent
 * rather than conditionally present; a checklist that names a route which 404s
 * is the failure ON7 exists to prevent. Adding one later means taking the same
 * `flags` record `BusinessSidebar` filters on, not a second source.
 */
export async function getOnboardingProgress(
  businessId: string,
  vocabulary: OfferingVocabulary,
): Promise<OnboardingProgress> {
  try {
    const supabase = await createServerSupabaseClient();

    const isFilled = (value: unknown): boolean =>
      typeof value === 'string' && value.trim().length > 0;

    /** One read covers both the profile item and the verification item. */
    const businessRead = async () => {
      const { data, error } = await supabase
        .from('businesses')
        .select('logo_url, banner_url, description, status')
        .eq('id', businessId)
        .maybeSingle();
      if (error) throw error;
      return data;
    };

    /**
     * A branch with no `location` is invisible to `nearby_businesses`, which
     * filters on it — so an unpinned branch is not a completed step, it is a
     * shop nobody can find. Same trap the events form hit.
     */
    const pinnedBranchCount = async () => {
      const { count, error } = await supabase
        .from('branches')
        .select('id', { count: 'exact', head: true })
        .eq('business_id', businessId)
        .is('archived_at', null)
        .not('location', 'is', null);
      if (error) throw error;
      return count ?? 0;
    };

    /**
     * `.maybeSingle()`, not `.single()`: the settings row is created lazily on
     * first save, so most shops have none. "No row" is *not done*, not an
     * error — `.single()` would raise PGRST116 and fail the whole checklist.
     */
    const settingsRead = async () => {
      const { data, error } = await supabase
        .from('business_settings')
        .select('operating_hours, contact_phone_public')
        .eq('business_id', businessId)
        .maybeSingle();
      if (error) throw error;
      return data;
    };

    /**
     * `status='active'` is part of "done", not decoration:
     * `sync_product_availability` sets `is_available = (status = 'active')`, so
     * an `unlisted` or `disabled` offering is invisible on the public page —
     * exactly the state this step exists to move the owner out of.
     */
    const activeOfferingCount = async () => {
      const { count, error } = await supabase
        .from('products')
        .select('id', { count: 'exact', head: true })
        .eq('business_id', businessId)
        .eq('status', 'active')
        .is('archived_at', null);
      if (error) throw error;
      return count ?? 0;
    };

    /**
     * Deliberately WITHOUT the status filter, and deliberately a second read.
     *
     * The dashboard's empty state asks a different question from the checklist
     * row: "has this owner added anything at all", not "is anything visible to
     * a shopper". Sharing the active count told a shop whose whole catalogue is
     * `unlisted` that it had "No products yet" and offered to add a first one —
     * a narrower rerun of the bug the empty state was gated to fix.
     */
    const totalOfferingCount = async () => {
      const { count, error } = await supabase
        .from('products')
        .select('id', { count: 'exact', head: true })
        .eq('business_id', businessId)
        .is('archived_at', null);
      if (error) throw error;
      return count ?? 0;
    };

    /**
     * "Has ever published one", NOT "has one live right now".
     *
     * The live window (`start_date <= now <= expiry_date`) was tried and
     * reverted: it makes done-ness expire with the clock, so the moment a
     * mature shop's last deal ran out the completed checklist reappeared,
     * telling an owner who had done the step years ago to publish their first
     * deal. A setup checklist records that a thing was learned; monitoring
     * whether a deal is currently running is the deals page's job.
     */
    const publishedPromoCount = async () => {
      const { count, error } = await supabase
        .from('coupons')
        .select('id', { count: 'exact', head: true })
        .eq('business_id', businessId)
        .eq('status', 'published')
        .is('archived_at', null);
      if (error) throw error;
      return count ?? 0;
    };

    const [business, branches, settings, offerings, allOfferings, promos] =
      await Promise.all([
        businessRead(),
        pinnedBranchCount(),
        settingsRead(),
        activeOfferingCount(),
        totalOfferingCount(),
        publishedPromoCount(),
      ]);

    if (!business) return { ...EMPTY_ONBOARDING_PROGRESS, failed: true };

    const status = (business.status ??
      null) as BusinessVerificationStatus | null;

    // `operating_hours` is JSONB, so "set" has to mean more than "not null" —
    // an empty object is what a form that saved nothing leaves behind, and it
    // renders no hours at all on the public page.
    const hours = settings?.operating_hours;
    const hasHours =
      typeof hours === 'object' &&
      hours !== null &&
      Object.keys(hours).length > 0;

    const items: OnboardingItem[] = [
      {
        id: 'profile',
        label: 'Complete your shop profile',
        detail:
          'Logo, banner and a description — the first thing a shopper sees.',
        done:
          isFilled(business.logo_url) &&
          isFilled(business.banner_url) &&
          isFilled(business.description),
        href: businessProfilePath(businessId),
      },
      {
        id: 'branch',
        label: 'Pin a branch on the map',
        detail:
          'Shops near me searches by location — an unpinned branch never appears.',
        done: branches > 0,
        href: businessBranchesPath(businessId),
      },
      {
        id: 'hours',
        label: 'Add opening hours and a contact number',
        detail: 'Your page shows Open now / Closed once hours are set.',
        done: hasHours && isFilled(settings?.contact_phone_public),
        href: businessSettingsPath(businessId),
      },
      {
        id: 'offering',
        label: vocabulary.addLabel,
        detail: `Your shop page is empty until it has at least one ${vocabulary.singular.toLowerCase()}.`,
        done: offerings > 0,
        href: businessProductCataloguesPath(businessId),
      },
      {
        id: 'promo',
        label: 'Publish your first deal',
        detail:
          'Published deals reach the app’s Deals feed. A draft reaches nobody.',
        done: promos > 0,
        href: businessCouponsPath(businessId),
      },
      {
        id: 'verification',
        label: VERIFICATION_COPY[status ?? 'pending'].label,
        detail: VERIFICATION_COPY[status ?? 'pending'].detail,
        done: status === 'verified',
        href: businessProfilePath(businessId),
        readOnly: true,
        status,
      },
    ];

    const actionable = items.filter((item) => !item.readOnly);
    const completed = actionable.filter((item) => item.done).length;

    return {
      items,
      completed,
      total: actionable.length,
      complete: completed === actionable.length,
      failed: false,
      offeringCount: offerings,
      totalOfferingCount: allOfferings,
    };
  } catch (err) {
    console.error('[getOnboardingProgress]', describeDbError(err));
    return { ...EMPTY_ONBOARDING_PROGRESS, failed: true };
  }
}

/**
 * The two stored onboarding facts, from `business_settings`.
 *
 * `React.cache`d because the LAYOUT needs the tour flag (to seed the provider)
 * and the PAGE needs the dismissal flag (to seed the card) — two components
 * that cannot pass props to each other, and a shop should not pay for the same
 * point lookup twice per request.
 *
 * `.maybeSingle()`, not `.single()`: the settings row is created lazily on
 * first save, so most shops have none. "No row" means neither has been
 * answered — it is not an error, and `.single()` would raise PGRST116 and turn
 * a brand-new shop's dashboard into the failure path.
 *
 * Never throws. A failed read reports `failed: true` with both flags false,
 * which SHOWS the guidance: wrongly showing a card is a small annoyance, while
 * wrongly hiding the setup checklist withholds the one thing a new owner needs.
 */
export const getOnboardingState = cache(
  async (businessId: string): Promise<OnboardingState> => {
    try {
      const supabase = await createServerSupabaseClient();

      const { data, error } = await supabase
        .from('business_settings')
        .select(
          'onboarding_tour_completed_at, onboarding_checklist_dismissed_at',
        )
        .eq('business_id', businessId)
        .maybeSingle();

      if (error) throw error;

      return {
        tourCompleted: data?.onboarding_tour_completed_at != null,
        checklistDismissed: data?.onboarding_checklist_dismissed_at != null,
        failed: false,
      };
    } catch (err) {
      console.error('[getOnboardingState]', describeDbError(err));
      return { ...EMPTY_ONBOARDING_STATE };
    }
  },
);
