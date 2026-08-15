import { faker } from '@faker-js/faker';
import { Factory } from 'fishery';

export interface EventSessionRow {
  id: string;
  eventId: string;
  speakerId: string;
  title: string;
  from: Date;
  to: Date;
  description: string;
  level: string;
  track: string;
  room: string;
  createdAt: Date;
  updatedAt: Date;
}

export const eventSessionFactory = Factory.define<EventSessionRow>(() => ({
  id: faker.string.uuid(),
  eventId: faker.string.uuid(),
  speakerId: faker.string.uuid(),
  title: 'Building Serverless Applications with AWS Lambda',
  from: new Date('2025-10-26T10:00:00.000Z'),
  to: new Date('2025-10-26T11:00:00.000Z'),
  description: 'Learn how to build scalable and cost-effective serverless applications.',
  level: 'Intermediate',
  track: 'Serverless',
  room: 'Venetian Ballroom A',
  createdAt: faker.date.past(),
  updatedAt: faker.date.recent(),
}));
