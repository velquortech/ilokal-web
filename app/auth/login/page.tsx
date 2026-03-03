import LoginForm from '@/components/auth/LoginForm';

export const metadata = {
  title: 'Login - Ilokal',
  description: 'Sign in to your Ilokal account',
};

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-linear-to-br from-slate-50 to-slate-100 px-4 py-12">
      <LoginForm />
    </div>
  );
}
