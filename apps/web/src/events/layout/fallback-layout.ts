import type { EventSession, LayoutComponent, Speaker } from '@eventflow/shared-types';

export function buildFallbackLayout(
  sessions: EventSession[],
  speakers: Speaker[],
): LayoutComponent[] {
  const components: LayoutComponent[] = [];

  if (sessions.length > 0) {
    components.push({
      id: 'fallback-session-schedule',
      type: 'SessionSchedule',
      data: { title: 'Session Schedule' },
      components: sessions.map((session) => ({
        id: session.id,
        type: 'SessionCard',
        data: {
          title: session.title,
          subtitle: session.track,
          description: session.description,
          from: session.from,
          to: session.to,
          room: session.room,
          speaker: {
            id: session.speaker.id,
            name: session.speaker.name,
            title: session.speaker.title,
            image: session.speaker.image,
          },
        },
        components: [],
      })),
    });
  }

  if (speakers.length > 0) {
    components.push({
      id: 'fallback-speaker-list',
      type: 'SpeakerList',
      data: { title: 'Speakers' },
      components: speakers.map((speaker) => ({
        id: speaker.id,
        type: 'SpeakerCard',
        data: { id: speaker.id },
        components: [],
      })),
    });
  }

  return components;
}
