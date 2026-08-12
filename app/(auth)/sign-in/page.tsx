import type { Metadata } from 'next';
import SignInForm from '@/components/auth/SignInForm';

export const metadata: Metadata = {
  title: 'Sign in',
  description:
    'Sign in to your iLokal account — customers and business owners.',
};

/**
 * Reads the query string server-side and hands it to the form as props.
 *
 * The form previously read `next`/`mfa` via `useSearchParams()` inside a
 * Suspense boundary. That opt-out of prerendering made the shipped document
 * contain only the fallback skeleton, so on a production build the fields
 * depended entirely on client-side hydration — any delay or JS failure left a
 * page with no form at all. Reading the params here (a server component) keeps
 * the full form in the HTML from the first byte.
 */
export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; mfa?: string }>;
}) {
  const sp = await searchParams;
  return (
    <SignInForm initialNext={sp.next} mfaRequired={sp.mfa === 'required'} />
  );
}
