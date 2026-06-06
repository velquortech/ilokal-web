import BusinessLoginForm from '@/components/auth/BusinessLoginForm';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Business Login - Ilokal',
  description: 'Sign in to the Ilokal business portal',
};

export default function BusinessLoginPage() {
  return <BusinessLoginForm />;
}
