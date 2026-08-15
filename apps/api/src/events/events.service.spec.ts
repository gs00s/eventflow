import { Test } from '@nestjs/testing';
import { describe, expect, it, vi } from 'vitest';
import { eventFactory, eventSessionFactory, speakerFactory } from '../test/fixtures';
import { EventsModule } from './events.module';
import { EventsRepository } from './events.repository';
import { EventsService } from './events.service';

describe('EventsService', () => {
  it('maps repository rows to event DTOs', async () => {
    const row = eventFactory.build();
    const module = await Test.createTestingModule({ imports: [EventsModule] }).compile();
    vi.spyOn(module.get(EventsRepository), 'findAll').mockResolvedValue([row]);
    const service = module.get(EventsService);

    const result = await service.findAll();

    expect(result).toEqual([
      {
        id: row.id,
        title: row.title,
        subtitle: row.subtitle,
        date: row.date,
        location: {
          city: row.locationCity,
          venue: row.locationVenue,
          address: row.locationAddress,
        },
        hero: { image: row.heroImage, cta: row.heroCta },
      },
    ]);
  });

  it('maps a detail row with its sessions and deduped speakers to an EventDetail DTO', async () => {
    const row = eventFactory.build();
    const speaker = speakerFactory.build();
    const session = eventSessionFactory.build({ eventId: row.id, speakerId: speaker.id });
    const module = await Test.createTestingModule({ imports: [EventsModule] }).compile();
    vi.spyOn(module.get(EventsRepository), 'findById').mockResolvedValue({
      ...row,
      sessions: [{ ...session, speaker }],
    });
    const service = module.get(EventsService);

    const result = await service.findById(row.id);

    expect(result).toEqual({
      id: row.id,
      title: row.title,
      subtitle: row.subtitle,
      date: row.date,
      location: {
        city: row.locationCity,
        venue: row.locationVenue,
        address: row.locationAddress,
      },
      hero: { image: row.heroImage, cta: row.heroCta },
      description: row.description,
      organizer: { name: row.organizerName, image: row.organizerImage },
      sessions: [
        {
          id: session.id,
          title: session.title,
          from: session.from.toISOString(),
          to: session.to.toISOString(),
          description: session.description,
          level: session.level,
          track: session.track,
          room: session.room,
          speaker: {
            id: speaker.id,
            name: speaker.name,
            title: speaker.title,
            bio: speaker.bio,
            image: speaker.image,
          },
        },
      ],
      speakers: [
        {
          id: speaker.id,
          name: speaker.name,
          title: speaker.title,
          bio: speaker.bio,
          image: speaker.image,
        },
      ],
    });
  });

  it('returns undefined when the event is not found', async () => {
    const module = await Test.createTestingModule({ imports: [EventsModule] }).compile();
    vi.spyOn(module.get(EventsRepository), 'findById').mockResolvedValue(undefined);
    const service = module.get(EventsService);

    const result = await service.findById('missing-id');

    expect(result).toBeUndefined();
  });
});
