import { faker } from '@faker-js/faker';
import { Factory } from 'fishery';

export interface SpeakerRow {
  id: string;
  name: string;
  title: string;
  bio: string;
  image: string;
  createdAt: Date;
  updatedAt: Date;
}

export const speakerFactory = Factory.define<SpeakerRow>(() => ({
  id: faker.string.uuid(),
  name: 'Dr. Jane Doe',
  title: 'VP of Engineering, Example Corp',
  bio: 'Expert in serverless architectures and cloud-native development.',
  image: '...',
  createdAt: faker.date.past(),
  updatedAt: faker.date.recent(),
}));
