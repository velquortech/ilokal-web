import { Suspense } from 'react';
import { Loader2 } from 'lucide-react';
import ResetPasswordForm from '@/components/auth/ResetPasswordForm';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Reset Password - Ilokal',
  description: 'Choose a new password for your Ilokal business account',
};

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="flex w-full max-w-sm justify-center py-10">
          <Loader2 className="text-muted-foreground h-6 w-6 animate-spin" />
        </div>
      }
    >
      <ResetPasswordForm />
    </Suspense>
  );
}
