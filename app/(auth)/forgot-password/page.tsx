import ForgotPasswordForm from '@/components/auth/ForgotPasswordForm';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Forgot password',
  description: 'Reset your Ilokal business account password',
};

export default function ForgotPasswordPage() {
  return <ForgotPasswordForm />;
}
