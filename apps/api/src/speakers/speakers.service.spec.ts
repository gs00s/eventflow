import { Test } from '@nestjs/testing';
import { describe, expect, it, vi } from 'vitest';
import { eventFactory, eventSessionFactory, speakerFactory } from '../test/fixtures';
import { SpeakersModule } from './speakers.module';
import { SpeakersRepository } from './speakers.repository';
import { SpeakersService } from './speakers.service';

describe('SpeakersService', () => {
  it('maps repository rows to speaker DTOs', async () => {
    const row = speakerFactory.build();
    const module = await Test.createTestingModule({ imports: [SpeakersModule] }).compile();
    vi.spyOn(module.get(SpeakersRepository), 'findAll').mockResolvedValue([row]);
    const service = module.get(SpeakersService);

    const result = await service.findAll();

    expect(result).toEqual([
      { id: row.id, name: row.name, title: row.title, bio: row.bio, image: row.image },
    ]);
  });

  it('maps a detail row to a speaker DTO', async () => {
    const row = speakerFactory.build();
    const module = await Test.createTestingModule({ imports: [SpeakersModule] }).compile();
    vi.spyOn(module.get(SpeakersRepository), 'findById').mockResolvedValue(row);
    const service = module.get(SpeakersService);

    const result = await service.findById(row.id);

    expect(result).toEqual({
      id: row.id,
      name: row.name,
      title: row.title,
      bio: row.bio,
      image: row.image,
    });
  });

  it('returns undefined when the speaker is not found', async () => {
    const module = await Test.createTestingModule({ imports: [SpeakersModule] }).compile();
    vi.spyOn(module.get(SpeakersRepository), 'findById').mockResolvedValue(undefined);
    const service = module.get(SpeakersService);

    const result = await service.findById('missing-id');

    expect(result).toBeUndefined();
  });

  it('maps and dedupes the public events returned by the repository', async () => {
    const speaker = speakerFactory.build();
    const event = eventFactory.build();
    const module = await Test.createTestingModule({ imports: [SpeakersModule] }).compile();
    vi.spyOn(module.get(SpeakersRepository), 'findPublicEvents').mockResolvedValue([
      { event },
      { event },
    ]);
    const service = module.get(SpeakersService);

    const result = await service.findPublicEvents(speaker.id);

    expect(result).toEqual([{ id: event.id, title: event.title, date: event.date }]);
  });

  it('includes VIP events in the full events list, deduped', async () => {
    const speaker = speakerFactory.build();
    const publicEvent = eventFactory.build();
    const vipEvent = eventFactory.build({ isVip: true });
    const publicSession = eventSessionFactory.build({
      eventId: publicEvent.id,
      speakerId: speaker.id,
    });
    const vipSession = eventSessionFactory.build({ eventId: vipEvent.id, speakerId: speaker.id });
    const module = await Test.createTestingModule({ imports: [SpeakersModule] }).compile();
    vi.spyOn(module.get(SpeakersRepository), 'findEvents').mockResolvedValue([
      { ...publicSession, event: publicEvent },
      { ...vipSession, event: vipEvent },
    ]);
    const service = module.get(SpeakersService);

    const result = await service.findAllEvents(speaker.id);

    expect(result.map((event) => event.id)).toEqual(
      expect.arrayContaining([publicEvent.id, vipEvent.id]),
    );
  });
});
