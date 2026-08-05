import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/api/getCurrentUser';
import { getOwnedBusinessId } from '@/lib/api/business/business';
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

/**
 * `generateMetadata`, not a static object: the share card quotes the step
 * count, and the count moves with `require_business_documents`. A hardcoded
 * "four steps" here would contradict the page it describes the day an admin
 * flips the flag — the same drift the page's whole design guards against, in
 * the one place search engines keep a copy of.
 */
export async function generateMetadata(): Promise<Metadata> {
  const { requireBusinessDocuments } = await getRegistrationSettings();
  const stepCount = getRegistrationStepMeta(requireBusinessDocuments).length;
  const description = `Ten minutes, ${stepCount} steps. Here is exactly what the form asks for.`;

  return {
    title: 'List your business',
    description: `How to get your shop on iLokal: what you need before you start, the ${stepCount} steps of the form, and what happens after you submit.`,
    alternates: { canonical: ROUTES.PUBLIC.FOR_BUSINESS },
    openGraph: {
      // Next REPLACES a parent `openGraph` rather than merging it, so the
      // fields the root layout sets have to be restated or the card loses its
      // site name and type — the defect `socialCard.ts` exists to stop
      // repeating.
      title: 'List your business on iLokal',
      description,
      url: ROUTES.PUBLIC.FOR_BUSINESS,
      siteName: 'iLokal',
      locale: 'en_PH',
      type: 'website',
    },
  };
}

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
    const ownedId = await getOwnedBusinessId(user.id);
    if (ownedId) redirect(businessPath(ownedId));
  }

  const steps = getRegistrationStepMeta(requireBusinessDocuments);

  // 🔴 Branch on ROLE, not on "is there a session".
  //
  // `roleAllowedForPath` lets only `business_owner` and `admin` into
  // `/business/**`, so pointing a signed-in CUSTOMER at the wizard hands them
  // the very dead-end this page exists to remove: the proxy bounces them to
  // `/home` with no explanation. And that path is one click away —
  // `CustomerFooter`'s "List your business" renders for every session on
  // /explore.
  const canRegister = user?.role === 'business_owner' || user?.role === 'admin';
  const ctaHref = canRegister
    ? ROUTES.BUSINESS.registration
    : ROUTES.AUTH.SIGNUP;
  const ctaLabel = canRegister ? 'Start registering' : 'Create an account';
  // A customer needs to know WHY the button says "create an account" when they
  // are plainly signed in.
  const ctaNote =
    user && !canRegister
      ? 'Registering a shop needs a business account — this creates one.'
      : undefined;

  return (
    <>
      <Hero
        ctaHref={ctaHref}
        ctaLabel={ctaLabel}
        ctaNote={ctaNote}
        stepCount={steps.length}
      />
      <Prerequisites requireDocuments={requireBusinessDocuments} />
      <StepSpine steps={steps} />
      <AfterSubmit autoVerify={autoVerifyBusinesses} />
      <Faq />
      <FinalCta
        ctaHref={ctaHref}
        ctaLabel={ctaLabel}
        stepCount={steps.length}
      />
    </>
  );
}
