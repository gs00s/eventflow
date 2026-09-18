import { Injectable } from '@nestjs/common';
import {
  layoutSchema,
  type Event,
  type EventDetail,
  type EventInput,
  type OwnedEvent,
} from '@eventflow/shared-types';
import type { events } from '../db/schemas';
import { EventsRepository } from './events.repository';
import { RegistrationsRepository } from './registrations.repository';

type EventRow = typeof events.$inferSelect;

@Injectable()
export class EventsService {
  constructor(
    private readonly eventsRepository: EventsRepository,
    private readonly registrationsRepository: RegistrationsRepository,
  ) {}

  async findPublic(q?: string): Promise<Event[]> {
    const rows = await this.eventsRepository.findPublic(q);

    return rows.map(toEvent);
  }

  async findAllForVip(q?: string): Promise<Event[]> {
    const rows = await this.eventsRepository.findAll(q);

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
      // Re-validated here since jsonb has no DB-level shape enforcement — drizzle's $type<>() is compile-time only.
      layout: row.layout ? layoutSchema.parse(row.layout) : null,
    };
  }

  findVipFlag(id: string): Promise<boolean | undefined> {
    return this.eventsRepository.findVipFlag(id);
  }

  async findMine(ownerId: string): Promise<OwnedEvent[]> {
    const rows = await this.eventsRepository.findByOwner(ownerId);

    return rows.map(toOwnedEvent);
  }

  async findMineById(id: string): Promise<{ event: OwnedEvent; ownerId: string } | undefined> {
    const row = await this.eventsRepository.findRawById(id);
    if (!row) return undefined;

    return { event: toOwnedEvent(row), ownerId: row.ownerId };
  }

  findOwnerId(id: string): Promise<string | undefined> {
    return this.eventsRepository.findOwnerId(id);
  }

  async create(ownerId: string, input: EventInput, isVipAllowed: boolean): Promise<OwnedEvent> {
    const row = await this.eventsRepository.create(ownerId, toEventFields(input, isVipAllowed));

    return toOwnedEvent(row);
  }

  async update(
    id: string,
    ownerId: string,
    input: EventInput,
    isVipAllowed: boolean,
  ): Promise<OwnedEvent | undefined> {
    const row = await this.eventsRepository.update(id, ownerId, toEventFields(input, isVipAllowed));

    return row ? toOwnedEvent(row) : undefined;
  }

  delete(id: string, ownerId: string): Promise<boolean> {
    return this.eventsRepository.delete(id, ownerId);
  }

  isRegistered(eventId: string, userId: string): Promise<boolean> {
    return this.registrationsRepository.existsForUser(userId, eventId);
  }

  register(userId: string, eventId: string): Promise<boolean> {
    return this.registrationsRepository.create(userId, eventId);
  }

  unregister(userId: string, eventId: string): Promise<boolean> {
    return this.registrationsRepository.delete(userId, eventId);
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
    isVip: row.isVip,
  };
}

function toEventFields(input: EventInput, isVipAllowed: boolean) {
  return {
    title: input.title,
    subtitle: input.subtitle,
    description: input.description,
    date: input.date,
    locationCity: input.location.city,
    locationVenue: input.location.venue,
    locationAddress: input.location.address,
    organizerName: input.organizer.name,
    organizerImage: input.organizer.image,
    heroImage: input.hero.image,
    heroCta: input.hero.cta,
    isVip: isVipAllowed ? input.isVip : false,
  };
}

function toOwnedEvent(row: EventRow): OwnedEvent {
  return {
    ...toEvent(row),
    description: row.description,
    organizer: { name: row.organizerName, image: row.organizerImage },
  };
}
