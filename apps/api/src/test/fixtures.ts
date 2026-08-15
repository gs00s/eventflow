import { faker } from '@faker-js/faker';
import type { UserSession } from '@thallesp/nestjs-better-auth';
import { Factory } from 'fishery';
import type { auth } from '../auth/auth';

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

export function sessionFor(overrides?: Partial<{ id: string; email: string; name: string }>) {
  return {
    user: {
      id: faker.string.uuid(),
      email: faker.internet.email(),
      name: 'Jane Doe',
      ...overrides,
    },
  } as UserSession<typeof auth>;
}
