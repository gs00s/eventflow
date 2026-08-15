import { Test, type TestingModule } from '@nestjs/testing';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { DbService } from '../db/db.service';
import { eventSessions, events, layouts, speakers } from '../db/schemas';
import { eventFactory, eventSessionFactory, layoutFactory, speakerFactory } from '../test/fixtures';
import { EventsModule } from './events.module';
import { EventsRepository } from './events.repository';

describe('EventsRepository (integration)', () => {
  let module: TestingModule;
  let repository: EventsRepository;
  const layout = layoutFactory.build();
  const event = eventFactory.build({ layoutId: layout.id });
  const speaker = speakerFactory.build();
  const session = eventSessionFactory.build({ eventId: event.id, speakerId: speaker.id });

  beforeAll(async () => {
    module = await Test.createTestingModule({ imports: [EventsModule] }).compile();
    repository = module.get(EventsRepository);

    const dbService = module.get(DbService);
    await dbService.db.delete(eventSessions);
    await dbService.db.delete(events);
    await dbService.db.delete(layouts);
    await dbService.db.delete(speakers);
    await dbService.db.insert(speakers).values(speaker);
    await dbService.db.insert(layouts).values(layout);
    await dbService.db.insert(events).values(event);
    await dbService.db.insert(eventSessions).values(session);
  });

  afterAll(async () => {
    await module.close();
  });

  it('returns the seeded events from the database', async () => {
    const result = await repository.findAll();

    expect(result).toEqual([expect.objectContaining({ title: event.title })]);
  });

  it('returns an event with its sessions, their assigned speakers, and its layout', async () => {
    const result = await repository.findById(event.id);

    expect(result).toMatchObject({
      title: event.title,
      sessions: [
        expect.objectContaining({
          title: session.title,
          speaker: expect.objectContaining({ id: speaker.id }),
        }),
      ],
      layout: expect.objectContaining({ id: layout.id }),
    });
  });

  it('returns undefined for an unknown event id', async () => {
    const result = await repository.findById('00000000-0000-0000-0000-000000000000');

    expect(result).toBeUndefined();
  });
});
