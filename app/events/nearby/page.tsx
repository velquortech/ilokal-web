import type { Metadata } from 'next';
import { NearbyEventsContent } from './components/nearby-events-content';

export const metadata: Metadata = {
  title: 'Events near me',
  description: 'Festivals, markets and gigs happening closest to you.',
};

export default function NearbyEventsPage() {
  return <NearbyEventsContent />;
}
