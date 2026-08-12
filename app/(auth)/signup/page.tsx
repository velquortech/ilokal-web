import SignupForm from '@/components/auth/SignupForm';

export const metadata = {
  title: 'Sign up',
  description: 'Create a new Ilokal account and join our local community',
};

/**
 * Reads the query string server-side and hands it to the form as props.
 *
 * The form previously read `mobile`/`next` via `useSearchParams()` inside a
 * Suspense boundary with an empty fallback — so on a production build the
 * shipped document contained NOTHING of the form, and it appeared only after
 * client-side hydration. Any delay or JS failure left a blank page. Reading
 * the params here (a server component) keeps the form in the HTML from the
 * first byte.
 */
export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ mobile?: string; next?: string }>;
}) {
  const sp = await searchParams;
  return <SignupForm isMobile={sp.mobile === 'true'} initialNext={sp.next} />;
}
