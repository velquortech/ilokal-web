import type { Metadata } from 'next';
import Link from 'next/link';

import { LegalDocument } from '@/components/custom/legal/LegalDocument';
import { PRIVACY_POLICY } from '@/lib/legal/content';
import { ROUTES } from '@/config/routeConfig';

/**
 * The hosted privacy policy — the URL Google Play's App content step requires.
 *
 * Static: it reads no session, no flags and no database, so it renders for an
 * anonymous reviewer, a crawler, or a phone on a bad connection. (The shared
 * shell above is dynamic because its header adapts to a session; that is the
 * chrome, not this document.)
 */
export const metadata: Metadata = {
  title: 'Privacy Policy',
  description:
    'What iLokal collects, how it is used and shared, how long it is kept, and how to delete your account.',
  alternates: { canonical: ROUTES.LEGAL.PRIVACY },
  // A policy is a reference document, not a landing page — but it must be
  // indexable, because "find their privacy policy" is a thing reviewers and
  // users both do from a search engine.
  robots: { index: true, follow: true },
};

export default function PrivacyPolicyPage() {
  return (
    <div className="space-y-10">
      <LegalDocument doc={PRIVACY_POLICY} />

      {/* The deletion section above tells people they can ask without the app
          installed; this is where it says so. A policy that describes a route
          it never links is a route most people never find. */}
      <aside className="mx-auto max-w-3xl">
        <div className="bg-muted/40 rounded-lg border p-5">
          <h2 className="font-semibold">Want your account deleted?</h2>
          <p className="text-muted-foreground mt-2 text-sm leading-relaxed">
            You can do it in the app, or ask us directly — no installation
            needed.
          </p>
          <Link
            href={ROUTES.LEGAL.DELETE_ACCOUNT}
            className="text-primary mt-3 inline-block text-sm font-medium underline underline-offset-4"
          >
            How to delete your iLokal account
          </Link>
        </div>
      </aside>
    </div>
  );
}
