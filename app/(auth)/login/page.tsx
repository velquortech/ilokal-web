import { redirect } from 'next/navigation';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Login - Ilokal',
  description: 'Sign in to your Ilokal account',
};

export default function LoginPage() {
  redirect('/login/business');
}
