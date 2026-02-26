import SignupForm from '@/components/auth/SignupForm';

export const metadata = {
  title: 'Sign Up - Ilokal',
  description: 'Create a new Ilokal account',
};

export default function SignupPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 px-4 py-12">
      <SignupForm />
    </div>
  );
}
