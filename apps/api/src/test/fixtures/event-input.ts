import { Factory } from 'fishery';
import type { EventInput } from '@eventflow/shared-types';

export const eventInputFactory = Factory.define<EventInput>(() => ({
  title: 'Kubernetes Deep Dive Workshop',
  subtitle: 'Hands-on container orchestration',
  description: 'Hands-on container orchestration for platform teams.',
  date: '2026-03-15',
  location: {
    city: 'Austin',
    venue: 'Austin Convention Center',
    address: '500 E Cesar Chavez St, Austin, TX 78701, USA',
  },
  organizer: { name: 'Snapsoft', image: '...' },
  hero: { image: '...', cta: 'Register Now' },
  isVip: false,
}));
