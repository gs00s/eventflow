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

  it('maps a detail row with its deduped linked events to a SpeakerDetail DTO', async () => {
    const row = speakerFactory.build();
    const event = eventFactory.build();
    const session = eventSessionFactory.build({ eventId: event.id, speakerId: row.id });
    const module = await Test.createTestingModule({ imports: [SpeakersModule] }).compile();
    vi.spyOn(module.get(SpeakersRepository), 'findById').mockResolvedValue({
      ...row,
      sessions: [{ ...session, event }],
    });
    const service = module.get(SpeakersService);

    const result = await service.findById(row.id);

    expect(result).toEqual({
      id: row.id,
      name: row.name,
      title: row.title,
      bio: row.bio,
      image: row.image,
      events: [{ id: event.id, title: event.title, date: event.date }],
    });
  });

  it('excludes VIP events from a speaker detail DTO', async () => {
    const row = speakerFactory.build();
    const publicEvent = eventFactory.build();
    const vipEvent = eventFactory.build({ isVip: true });
    const publicSession = eventSessionFactory.build({
      eventId: publicEvent.id,
      speakerId: row.id,
    });
    const vipSession = eventSessionFactory.build({ eventId: vipEvent.id, speakerId: row.id });
    const module = await Test.createTestingModule({ imports: [SpeakersModule] }).compile();
    vi.spyOn(module.get(SpeakersRepository), 'findById').mockResolvedValue({
      ...row,
      sessions: [
        { ...publicSession, event: publicEvent },
        { ...vipSession, event: vipEvent },
      ],
    });
    const service = module.get(SpeakersService);

    const result = await service.findById(row.id);

    expect(result?.events).toEqual([
      { id: publicEvent.id, title: publicEvent.title, date: publicEvent.date },
    ]);
  });

  it('returns undefined when the speaker is not found', async () => {
    const module = await Test.createTestingModule({ imports: [SpeakersModule] }).compile();
    vi.spyOn(module.get(SpeakersRepository), 'findById').mockResolvedValue(undefined);
    const service = module.get(SpeakersService);

    const result = await service.findById('missing-id');

    expect(result).toBeUndefined();
  });
});
