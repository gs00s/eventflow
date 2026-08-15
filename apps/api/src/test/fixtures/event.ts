import { faker } from '@faker-js/faker';
import { Factory } from 'fishery';

export interface EventRow {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  heroImage: string;
  heroCta: string;
  date: string;
  locationCity: string;
  locationVenue: string;
  locationAddress: string;
  organizerName: string;
  organizerImage: string;
  createdAt: Date;
  updatedAt: Date;
}

export const eventFactory = Factory.define<EventRow>(() => ({
  id: faker.string.uuid(),
  title: 'AWS Cloud Innovators Summit',
  subtitle: 'Explore the future of cloud computing',
  description: 'A one-day event focused on cloud, AI/ML, and serverless technologies.',
  heroImage: '...',
  heroCta: 'Register Now',
  date: '2025-10-26',
  locationCity: 'Las Vegas',
  locationVenue: 'The Venetian Resort',
  locationAddress: '3355 Las Vegas Blvd S, Las Vegas, NV 89109, USA',
  organizerName: 'Snapsoft',
  organizerImage: '...',
  createdAt: faker.date.past(),
  updatedAt: faker.date.recent(),
}));
