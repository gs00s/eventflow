import { Factory } from 'fishery';

export interface SpeakerFixture {
  id: string;
  name: string;
  title: string;
  bio: string;
  image: string;
}

export const speakerFactory = Factory.define<SpeakerFixture>(({ sequence }) => ({
  id: `speaker-${sequence}`,
  name: 'Dr. Jane Doe',
  title: 'VP of Engineering, Example Corp',
  bio: 'Expert in serverless architectures and cloud-native development.',
  image: '...',
}));
