import type { Metadata } from 'next';
import { NearbyContent } from './components/nearby-content';

export const metadata: Metadata = {
  title: 'Shops near me',
  description: 'Find the verified local shops closest to you.',
};

export default function NearbyPage() {
  return <NearbyContent />;
}
