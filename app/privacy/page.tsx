import type { Metadata } from 'next';

import { PublicShell } from '@/components/customer/PublicShell';
import { LegalDocPage } from '@/components/legal/LegalDocPage';
import { ROUTES } from '@/config/routeConfig';
import { PRIVACY_DOC } from '@/lib/legal/content';

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description:
    'How iLokal collects, uses, and protects your personal information — read the full privacy policy.',
  alternates: { canonical: ROUTES.PUBLIC.PRIVACY },
  openGraph: {
    title: 'Privacy Policy · iLokal',
    description:
      'How iLokal collects, uses, and protects your personal information.',
    url: ROUTES.PUBLIC.PRIVACY,
    siteName: 'iLokal',
    locale: 'en_PH',
    type: 'website',
  },
};

/**
 * Hosted Privacy Policy — public URL required by Google Play's App-content
 * step. Wording mirrors the mobile in-app reader (lib/legal/content.ts).
 */
export default function PrivacyPage() {
  return (
    <PublicShell>
      <LegalDocPage doc={PRIVACY_DOC} />
    </PublicShell>
  );
}
