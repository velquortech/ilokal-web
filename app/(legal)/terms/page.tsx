import type { Metadata } from 'next';
import Link from 'next/link';

import { LegalDocument } from '@/components/custom/legal/LegalDocument';
import { TERMS_OF_SERVICE } from '@/lib/legal/content';
import { ROUTES } from '@/config/routeConfig';

/**
 * The hosted Terms of Service.
 *
 * Static, for the same reason the policy is: it reads no session, no flags and
 * no database, so it renders for an anonymous reader, a crawler, or a store
 * reviewer following the listing link. The shared shell above is dynamic
 * because its header adapts to a session; that is the chrome, not this
 * document.
 *
 * No `PublicShell` here — `app/(legal)/layout.tsx` already mounts it. Wrapping
 * again would nest a second header and footer inside the first.
 */
export const metadata: Metadata = {
  title: 'Terms of Service',
  description:
    'The terms that govern your use of iLokal — accounts, coupons and deals, reviews, acceptable use, and how to close your account.',
  alternates: { canonical: ROUTES.LEGAL.TERMS },
  // Indexable for the same reason as the policy: "find their terms" is a thing
  // reviewers and users both do from a search engine rather than from the app.
  robots: { index: true, follow: true },
};

export default function TermsOfServicePage() {
  return (
    <div className="space-y-10">
      <LegalDocument doc={TERMS_OF_SERVICE} />

      {/* The Termination section defers to the policy for what deletion
          actually does, and the intro binds the reader to it. A document that
          references another twice without linking it once is a document most
          people never leave. */}
      <aside className="mx-auto max-w-3xl">
        <div className="bg-muted/40 rounded-lg border p-5">
          <h2 className="font-semibold">How we handle your data</h2>
          <p className="text-muted-foreground mt-2 text-sm leading-relaxed">
            These Terms cover your use of iLokal. What we collect, how long we
            keep it, and what happens when you close your account are in the
            Privacy Policy.
          </p>
          <Link
            href={ROUTES.LEGAL.PRIVACY}
            className="text-primary mt-3 inline-block text-sm font-medium underline underline-offset-4"
          >
            Read the Privacy Policy
          </Link>
        </div>
      </aside>
    </div>
  );
}
