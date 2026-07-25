import type { Metadata } from 'next';
import { NearbyContent } from './components/nearby-content';

export const metadata: Metadata = {
  title: 'Shops Near Me - iLokal',
  description: 'Find the verified local shops closest to you.',
};

export default function NearbyPage() {
  return <NearbyContent />;
}
