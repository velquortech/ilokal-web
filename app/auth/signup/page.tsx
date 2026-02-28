import SignupForm from '@/components/auth/SignupForm';

export const metadata = {
  title: 'Sign Up - Ilokal',
  description: 'Create a new Ilokal account and join our local community',
};

export default function SignupPage() {
  return (
    <div className="bg-background flex min-h-screen w-full items-center justify-center px-4 py-12">
      <SignupForm />
    </div>
  );
}
