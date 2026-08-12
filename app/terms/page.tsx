import type { Metadata } from 'next';

import { PublicShell } from '@/components/customer/PublicShell';
import { LegalDocPage } from '@/components/legal/LegalDocPage';
import { ROUTES } from '@/config/routeConfig';
import { TERMS_DOC } from '@/lib/legal/content';

export const metadata: Metadata = {
  title: 'Terms of Service',
  description:
    'The terms that govern your use of iLokal — read the full terms of service.',
  alternates: { canonical: ROUTES.PUBLIC.TERMS },
  openGraph: {
    title: 'Terms of Service · iLokal',
    description: 'The terms that govern your use of iLokal.',
    url: ROUTES.PUBLIC.TERMS,
    siteName: 'iLokal',
    locale: 'en_PH',
    type: 'website',
  },
};

/**
 * Hosted Terms of Service. Wording mirrors the mobile in-app reader
 * (lib/legal/content.ts).
 */
export default function TermsPage() {
  return (
    <PublicShell>
      <LegalDocPage doc={TERMS_DOC} />
    </PublicShell>
  );
}
