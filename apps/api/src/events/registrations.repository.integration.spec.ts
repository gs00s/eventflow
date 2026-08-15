import { Test, type TestingModule } from '@nestjs/testing';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { DbService } from '../db/db.service';
import { events, registrations, user } from '../db/schemas';
import { eventFactory, userFactory } from '../test/fixtures';
import { EventsModule } from './events.module';
import { RegistrationsRepository } from './registrations.repository';

describe('RegistrationsRepository (integration)', () => {
  let module: TestingModule;
  let repository: RegistrationsRepository;
  const event = eventFactory.build();
  const registrant = userFactory.build();

  beforeAll(async () => {
    module = await Test.createTestingModule({ imports: [EventsModule] }).compile();
    repository = module.get(RegistrationsRepository);

    const dbService = module.get(DbService);
    await dbService.db.delete(registrations);
    await dbService.db.delete(events);
    await dbService.db.insert(events).values(event);
    await dbService.db.insert(user).values(registrant);
  });

  afterAll(async () => {
    await module.close();
  });

  it('reports no registration for a viewer who has not registered', async () => {
    const result = await repository.existsForUser(registrant.id, event.id);

    expect(result).toBe(false);
  });

  it('creates a registration and reports it as existing afterwards', async () => {
    const created = await repository.create(registrant.id, event.id);
    const result = await repository.existsForUser(registrant.id, event.id);

    expect(created).toBe(true);
    expect(result).toBe(true);
  });

  it('does not create a duplicate registration for the same user and event', async () => {
    const anotherEvent = eventFactory.build();
    await module.get(DbService).db.insert(events).values(anotherEvent);

    const first = await repository.create(registrant.id, anotherEvent.id);
    const second = await repository.create(registrant.id, anotherEvent.id);

    expect(first).toBe(true);
    expect(second).toBe(false);
  });

  it('reports false deleting a registration that does not exist', async () => {
    const anotherEvent = eventFactory.build();
    await module.get(DbService).db.insert(events).values(anotherEvent);

    const result = await repository.delete(registrant.id, anotherEvent.id);

    expect(result).toBe(false);
  });

  it('deletes an existing registration and reports it as gone afterwards', async () => {
    const anotherEvent = eventFactory.build();
    await module.get(DbService).db.insert(events).values(anotherEvent);
    await repository.create(registrant.id, anotherEvent.id);

    const deleted = await repository.delete(registrant.id, anotherEvent.id);
    const result = await repository.existsForUser(registrant.id, anotherEvent.id);

    expect(deleted).toBe(true);
    expect(result).toBe(false);
  });
});
