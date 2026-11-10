import { Factory } from 'fishery';

export interface EventFieldsFixture {
  title: string;
  subtitle: string;
  description: string;
  date: string;
  locationCity: string;
  locationVenue: string;
  locationAddress: string;
  organizerName: string;
  organizerImage: string;
  heroImage: string;
  heroCta: string;
  isVip: boolean;
}

export const eventFieldsFactory = Factory.define<EventFieldsFixture>(() => ({
  title: 'Kubernetes Deep Dive Workshop',
  subtitle: 'Hands-on container orchestration',
  description: 'Hands-on container orchestration for platform teams.',
  date: '2026-03-15',
  locationCity: 'Austin',
  locationVenue: 'Austin Convention Center',
  locationAddress: '500 E Cesar Chavez St, Austin, TX 78701, USA',
  organizerName: 'Snapsoft',
  organizerImage: '...',
  heroImage: '...',
  heroCta: 'Register Now',
  isVip: false,
}));
