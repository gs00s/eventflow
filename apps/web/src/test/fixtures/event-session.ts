import { Factory } from 'fishery';
import { speakerFactory, type SpeakerFixture } from './speaker';

export interface EventSessionFixture {
  id: string;
  title: string;
  from: string;
  to: string;
  description: string;
  level: string;
  track: string;
  room: string;
  speaker: SpeakerFixture;
}

export const eventSessionFactory = Factory.define<EventSessionFixture>(({ sequence }) => ({
  id: `session-${sequence}`,
  title: 'Building Serverless Applications with AWS Lambda',
  from: '2025-10-26T10:00:00.000Z',
  to: '2025-10-26T11:00:00.000Z',
  description: 'Learn how to build scalable and cost-effective serverless applications.',
  level: 'Intermediate',
  track: 'Serverless',
  room: 'Venetian Ballroom A',
  speaker: speakerFactory.build(),
}));
