import { Test } from '@nestjs/testing';
import { describe, expect, it, vi } from 'vitest';
import { eventFactory, eventSessionFactory, layoutFactory, speakerFactory } from '../test/fixtures';
import { EventsModule } from './events.module';
import { EventsRepository } from './events.repository';
import { EventsService } from './events.service';

describe('EventsService', () => {
  it('maps public repository rows to event DTOs', async () => {
    const row = eventFactory.build();
    const module = await Test.createTestingModule({ imports: [EventsModule] }).compile();
    vi.spyOn(module.get(EventsRepository), 'findPublic').mockResolvedValue([row]);
    const service = module.get(EventsService);

    const result = await service.findPublic();

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
        isVip: row.isVip,
      },
    ]);
  });

  it('maps every repository row to event DTOs for the VIP list', async () => {
    const publicRow = eventFactory.build();
    const vipRow = eventFactory.build({ isVip: true });
    const module = await Test.createTestingModule({ imports: [EventsModule] }).compile();
    vi.spyOn(module.get(EventsRepository), 'findAll').mockResolvedValue([publicRow, vipRow]);
    const service = module.get(EventsService);

    const result = await service.findAllForVip();

    expect(result.map((event) => event.id)).toEqual([publicRow.id, vipRow.id]);
    expect(result.find((event) => event.id === vipRow.id)?.isVip).toBe(true);
  });

  it('maps a detail row with its sessions, deduped speakers, and layout to an EventDetail DTO', async () => {
    const row = eventFactory.build();
    const speaker = speakerFactory.build();
    const session = eventSessionFactory.build({ eventId: row.id, speakerId: speaker.id });
    const layout = layoutFactory.build();
    const module = await Test.createTestingModule({ imports: [EventsModule] }).compile();
    vi.spyOn(module.get(EventsRepository), 'findById').mockResolvedValue({
      ...row,
      sessions: [{ ...session, speaker }],
      layout,
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
      isVip: row.isVip,
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
      layout: { id: layout.id, components: layout.components },
    });
  });

  it('returns a null layout when the event has none', async () => {
    const row = eventFactory.build();
    const module = await Test.createTestingModule({ imports: [EventsModule] }).compile();
    vi.spyOn(module.get(EventsRepository), 'findById').mockResolvedValue({
      ...row,
      sessions: [],
      layout: null,
    });
    const service = module.get(EventsService);

    const result = await service.findById(row.id);

    expect(result?.layout).toBeNull();
  });

  it('rejects a malformed layout instead of serving it', async () => {
    const row = eventFactory.build();
    const layout = layoutFactory.build({
      // @ts-expect-error deliberately invalid: an unknown component type
      components: [{ id: 'x', type: 'Video', data: {}, components: [] }],
    });
    const module = await Test.createTestingModule({ imports: [EventsModule] }).compile();
    vi.spyOn(module.get(EventsRepository), 'findById').mockResolvedValue({
      ...row,
      sessions: [],
      layout,
    });
    const service = module.get(EventsService);

    await expect(service.findById(row.id)).rejects.toThrow();
  });

  it('returns undefined when the event is not found', async () => {
    const module = await Test.createTestingModule({ imports: [EventsModule] }).compile();
    vi.spyOn(module.get(EventsRepository), 'findById').mockResolvedValue(undefined);
    const service = module.get(EventsService);

    const result = await service.findById('missing-id');

    expect(result).toBeUndefined();
  });
});
