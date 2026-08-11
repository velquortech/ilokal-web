import { PublicShell } from '@/components/customer/PublicShell';

/**
 * Chrome for the hosted legal surfaces — /privacy and /delete-account.
 *
 * A route group, so it adds no path segment: the URLs stay exactly what is
 * typed into the Play Console, and those are the hardest URLs in the product
 * to change later.
 *
 * In a LAYOUT rather than each page, matching /for-business, /explore and
 * /events: composed inside the page, the header and footer could not paint
 * until the page's own reads resolved, because nothing sat between them.
 *
 * No auth gate and no kill switch. Both pages must answer for a signed-out
 * stranger — a policy URL that redirects to sign-in fails Play review, and the
 * deletion page exists precisely for people who no longer have the app.
 */
export default function LegalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <PublicShell>{children}</PublicShell>;
}
