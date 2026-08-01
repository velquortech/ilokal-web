import AdminLoginForm from '@/components/auth/AdminLoginForm';

export const metadata = {
  title: 'Admin sign in',
  description: 'Sign in to the Ilokal admin portal',
};

export default function AdminLoginPage() {
  return <AdminLoginForm />;
}
