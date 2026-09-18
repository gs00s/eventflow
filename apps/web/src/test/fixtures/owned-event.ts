import { Factory } from 'fishery';
import type { EventFixture } from './event';

export interface OwnedEventFixture extends EventFixture {
  description: string;
  organizer: { name: string; image: string };
}

export const ownedEventFactory = Factory.define<OwnedEventFixture>(({ sequence }) => ({
  id: `event-${sequence}`,
  title: 'AWS Cloud Innovators Summit',
  subtitle: 'Explore the future of cloud computing',
  description: 'A one-day event focused on cloud, AI/ML, and serverless technologies.',
  date: '2025-10-26',
  location: {
    city: 'Las Vegas',
    venue: 'The Venetian Resort',
    address: '3355 Las Vegas Blvd S, Las Vegas, NV 89109, USA',
  },
  organizer: { name: 'Snapsoft', image: '...' },
  hero: { image: '...', cta: 'Register Now' },
  isVip: false,
}));
