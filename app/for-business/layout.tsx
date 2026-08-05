import { PublicShell } from '@/components/customer/PublicShell';

/**
 * Chrome for the public registration explainer, in a LAYOUT rather than in the
 * page — matching `/explore` and `/events`.
 *
 * It is not cosmetic: composed inside the page, the header and footer could not
 * paint until every one of the page's own reads had resolved, because there was
 * no Suspense boundary between them. With the shell here, `loading.tsx` fills
 * the content column while the page's flags and session lookup finish.
 *
 * No kill switch, unlike the events layout: this page is how someone finds out
 * the product exists.
 */
export default function ForBusinessLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <PublicShell>{children}</PublicShell>;
}
