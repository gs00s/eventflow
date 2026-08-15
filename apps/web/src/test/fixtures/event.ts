import { Factory } from 'fishery';

export interface EventFixture {
  id: string;
  title: string;
  subtitle: string;
  date: string;
  location: { city: string; venue: string; address: string };
  hero: { image: string; cta: string };
  isVip: boolean;
}

export const eventFactory = Factory.define<EventFixture>(({ sequence }) => ({
  id: `event-${sequence}`,
  title: 'AWS Cloud Innovators Summit',
  subtitle: 'Explore the future of cloud computing',
  date: '2025-10-26',
  location: {
    city: 'Las Vegas',
    venue: 'The Venetian Resort',
    address: '3355 Las Vegas Blvd S, Las Vegas, NV 89109, USA',
  },
  hero: { image: '...', cta: 'Register Now' },
  isVip: false,
}));
