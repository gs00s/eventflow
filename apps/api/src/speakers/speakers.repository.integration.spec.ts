import { Test, type TestingModule } from '@nestjs/testing';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { DbService } from '../db/db.service';
import { eventSessions, events, speakers } from '../db/schemas';
import { eventFactory, eventSessionFactory, speakerFactory } from '../test/fixtures';
import { SpeakersModule } from './speakers.module';
import { SpeakersRepository } from './speakers.repository';

describe('SpeakersRepository (integration)', () => {
  let module: TestingModule;
  let repository: SpeakersRepository;
  const speaker = speakerFactory.build();
  const event = eventFactory.build();
  const vipEvent = eventFactory.build({ isVip: true });
  const session = eventSessionFactory.build({ eventId: event.id, speakerId: speaker.id });
  const vipSession = eventSessionFactory.build({ eventId: vipEvent.id, speakerId: speaker.id });

  beforeAll(async () => {
    module = await Test.createTestingModule({ imports: [SpeakersModule] }).compile();
    repository = module.get(SpeakersRepository);

    const dbService = module.get(DbService);
    await dbService.db.delete(eventSessions);
    await dbService.db.delete(events);
    await dbService.db.delete(speakers);
    await dbService.db.insert(speakers).values(speaker);
    await dbService.db.insert(events).values([event, vipEvent]);
    await dbService.db.insert(eventSessions).values([session, vipSession]);
  });

  afterAll(async () => {
    await module.close();
  });

  it('returns the seeded speakers from the database', async () => {
    const result = await repository.findAll();

    expect(result).toEqual([expect.objectContaining({ name: speaker.name })]);
  });

  it('returns a speaker by id', async () => {
    const result = await repository.findById(speaker.id);

    expect(result).toMatchObject({ name: speaker.name });
  });

  it('returns undefined for an unknown speaker id', async () => {
    const result = await repository.findById('00000000-0000-0000-0000-000000000000');

    expect(result).toBeUndefined();
  });

  it('reports whether a speaker id exists', async () => {
    const found = await repository.exists(speaker.id);
    const notFound = await repository.exists('00000000-0000-0000-0000-000000000000');

    expect(found).toBe(true);
    expect(notFound).toBe(false);
  });

  it('returns every session with its linked event, VIP included', async () => {
    const result = await repository.findEvents(speaker.id);

    expect(result.map((row) => row.event.id)).toEqual(
      expect.arrayContaining([event.id, vipEvent.id]),
    );
  });

  it('excludes VIP events from the public events query', async () => {
    const result = await repository.findPublicEvents(speaker.id);

    expect(result.map((row) => row.event.id)).toEqual([event.id]);
  });
});
