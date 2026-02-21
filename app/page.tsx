import { useTransition } from 'react';
import { businessApi } from '@/services/business/business.services';
import HomePage from './home/page';

export default async function Home() {
  const response = await businessApi();

  console.log(response);

  return <HomePage />;
}
