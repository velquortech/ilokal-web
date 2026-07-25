import type { Metadata } from 'next';
import SignInForm from '@/components/auth/SignInForm';

export const metadata: Metadata = {
  title: 'Sign in - Ilokal',
  description:
    'Sign in to your iLokal account — customers and business owners.',
};

export default function SignInPage() {
  return <SignInForm />;
}
