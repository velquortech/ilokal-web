import BusinessLoginForm from '@/components/auth/BusinessLoginForm';

// createBrowserClient is called inside BusinessLoginForm at component scope.
// Prevent static prerendering so the Supabase client is never evaluated
// during `next build` when NEXT_PUBLIC_SUPABASE_URL is absent (e.g. CI).
export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Business Login - Ilokal',
  description: 'Sign in to the Ilokal business portal',
};

export default function BusinessLoginPage() {
  return <BusinessLoginForm />;
}
