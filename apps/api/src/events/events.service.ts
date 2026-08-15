import { Injectable } from '@nestjs/common';
import type { Event, EventDetail } from '@eventflow/shared-types';
import type { events } from '../db/schemas';
import { EventsRepository } from './events.repository';

type EventRow = typeof events.$inferSelect;

@Injectable()
export class EventsService {
  constructor(private readonly eventsRepository: EventsRepository) {}

  async findAll(): Promise<Event[]> {
    const rows = await this.eventsRepository.findAll();

    return rows.map(toEvent);
  }

  async findById(id: string): Promise<EventDetail | undefined> {
    const row = await this.eventsRepository.findById(id);
    if (!row) return undefined;

    const speakersById = new Map(row.sessions.map(({ speaker }) => [speaker.id, speaker]));

    return {
      ...toEvent(row),
      description: row.description,
      organizer: {
        name: row.organizerName,
        image: row.organizerImage,
      },
      sessions: row.sessions.map((session) => ({
        id: session.id,
        title: session.title,
        from: session.from.toISOString(),
        to: session.to.toISOString(),
        description: session.description,
        level: session.level,
        track: session.track,
        room: session.room,
        speaker: {
          id: session.speaker.id,
          name: session.speaker.name,
          title: session.speaker.title,
          bio: session.speaker.bio,
          image: session.speaker.image,
        },
      })),
      speakers: [...speakersById.values()].map((speaker) => ({
        id: speaker.id,
        name: speaker.name,
        title: speaker.title,
        bio: speaker.bio,
        image: speaker.image,
      })),
    };
  }
}

function toEvent(row: EventRow): Event {
  return {
    id: row.id,
    title: row.title,
    subtitle: row.subtitle,
    date: row.date,
    location: {
      city: row.locationCity,
      venue: row.locationVenue,
      address: row.locationAddress,
    },
    hero: {
      image: row.heroImage,
      cta: row.heroCta,
    },
  };
}
