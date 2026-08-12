import ResetPasswordForm from '@/components/auth/ResetPasswordForm';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Reset password',
  description: 'Choose a new password for your Ilokal business account',
};

/**
 * Reads the query string server-side and hands it to the form as a prop.
 *
 * The form previously read `token_hash` via `useSearchParams()` inside this
 * Suspense boundary. That opt-out of prerendering made the shipped document
 * contain only the fallback spinner, so the reset form depended entirely on
 * client-side hydration — a user opening their reset link with slow or
 * blocked JS saw a spinner and nothing else. Reading the param here (a server
 * component) keeps the form in the HTML from the first byte.
 */
export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token_hash?: string }>;
}) {
  const sp = await searchParams;
  return <ResetPasswordForm initialTokenHash={sp.token_hash ?? null} />;
}
