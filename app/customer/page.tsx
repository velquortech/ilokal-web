import { redirect } from 'next/navigation';
import { ROUTES } from '@/config/routeConfig';

export default function CustomerHomePage() {
  redirect(ROUTES.CUSTOMER.WALLET);
}
