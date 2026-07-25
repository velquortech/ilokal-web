import type { Metadata } from 'next';
import CustomerLoginForm from '@/components/auth/CustomerLoginForm';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Login - Ilokal',
  description: 'Sign in to your iLokal customer account',
};

export default function LoginPage() {
  return <CustomerLoginForm />;
}
