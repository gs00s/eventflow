import { Factory } from 'fishery';
import type { Layout } from '@eventflow/shared-types';
import { speakerFactory } from './speaker';

export const layoutFactory = Factory.define<Layout>(({ sequence }) => {
  const sessionSpeaker = speakerFactory.build({ name: 'Dr. Jane Doe' });

  return {
    id: `layout-${sequence}`,
    components: [
      {
        id: `heading-${sequence}`,
        type: 'Heading',
        data: { text: 'About the Summit', level: 'h2' },
        components: [],
      },
      {
        id: `paragraph-${sequence}`,
        type: 'Paragraph',
        data: { text: 'Join us for a day of cloud innovation.' },
        components: [],
      },
      {
        id: `session-schedule-${sequence}`,
        type: 'SessionSchedule',
        data: { title: 'Session Schedule' },
        components: [
          {
            id: `session-card-${sequence}`,
            type: 'SessionCard',
            data: {
              title: 'Building Serverless Applications',
              subtitle: 'What is serverless?',
              description: 'How to do it with AWS',
              from: '2025-10-26T10:00:00.000Z',
              to: '2025-10-26T11:00:00.000Z',
              room: 'Ballroom A',
              speaker: {
                id: sessionSpeaker.id,
                name: sessionSpeaker.name,
                title: sessionSpeaker.title,
                image: sessionSpeaker.image,
              },
            },
            components: [],
          },
        ],
      },
      {
        id: `speaker-list-${sequence}`,
        type: 'SpeakerList',
        data: { title: 'Featured Speakers' },
        components: [
          {
            id: `speaker-card-${sequence}`,
            type: 'SpeakerCard',
            data: { id: `featured-speaker-${sequence}` },
            components: [],
          },
        ],
      },
    ],
  };
});
