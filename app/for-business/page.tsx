import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { PublicShell } from '@/components/customer/PublicShell';
import { getCurrentUser } from '@/lib/api/getCurrentUser';
import { getMyBusinesses } from '@/lib/api/business/business';
import { getRegistrationSettings } from '@/lib/api/appSettings';
import { getRegistrationStepMeta } from '@/app/business/registration/data/stepMeta';
import { ROUTES, businessPath } from '@/config/routeConfig';
import {
  AfterSubmit,
  Faq,
  FinalCta,
  Hero,
  Prerequisites,
  StepSpine,
} from './sections';

export const metadata: Metadata = {
  title: 'List your business',
  description:
    'How to get your shop on iLokal: what you need before you start, the four steps of the form, and what happens after you submit.',
  alternates: { canonical: ROUTES.PUBLIC.FOR_BUSINESS },
  openGraph: {
    // Next REPLACES a parent `openGraph` rather than merging it, so the fields
    // the root layout sets have to be restated or the card loses its site name
    // and type — the defect `socialCard.ts` exists to stop repeating.
    title: 'List your business on iLokal',
    description:
      'Ten minutes, four steps. Here is exactly what the form asks for.',
    url: ROUTES.PUBLIC.FOR_BUSINESS,
    siteName: 'iLokal',
    locale: 'en_PH',
    type: 'website',
  },
};

/**
 * The public "how to register" page.
 *
 * Exists because every public "List your business" CTA pointed straight at the
 * wizard — which lives under `/business`, a wholesale protected prefix — so a
 * logged-out visitor was bounced to `/sign-in` having been told nothing about
 * what registering involves.
 *
 * Everything factual here is DERIVED: the steps come from the wizard's own
 * `stepMeta`, the documents line from `require_business_documents`, and the
 * after-submit copy from `auto_verify_businesses`. A marketing page that
 * hardcodes any of the three starts lying the day an admin flips a switch —
 * which is exactly what the registration success dialog had to be fixed for.
 */
export default async function ForBusinessPage() {
  const [user, { requireBusinessDocuments, autoVerifyBusinesses }] =
    await Promise.all([getCurrentUser(), getRegistrationSettings()]);

  // An owner who already has a shop has no use for this page. One who has
  // signed up but not registered yet does — the page is where they find out
  // what to gather, so they are shown it with a CTA straight into the wizard.
  if (user?.role === 'business_owner') {
    const business = await getMyBusinesses().catch(() => null);
    if (business?.id) redirect(businessPath(business.id));
  }

  const steps = getRegistrationStepMeta(requireBusinessDocuments);

  // Anonymous visitors have to make an account before the wizard will open,
  // so send them to signup rather than into the redirect they came here from.
  const signedIn = Boolean(user);
  const ctaHref = signedIn ? ROUTES.BUSINESS.registration : ROUTES.AUTH.SIGNUP;
  const ctaLabel = signedIn ? 'Start registering' : 'Create an account';

  return (
    <PublicShell>
      <Hero ctaHref={ctaHref} ctaLabel={ctaLabel} />
      <Prerequisites requireDocuments={requireBusinessDocuments} />
      <StepSpine steps={steps} />
      <AfterSubmit autoVerify={autoVerifyBusinesses} />
      <Faq />
      <FinalCta ctaHref={ctaHref} ctaLabel={ctaLabel} />
    </PublicShell>
  );
}
