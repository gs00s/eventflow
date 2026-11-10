import { Test, type TestingModule } from '@nestjs/testing';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { DbService } from '../db/db.service';
import { eventSessions, events, layouts, speakers, user } from '../db/schemas';
import {
  eventFactory,
  eventFieldsFactory,
  eventSessionFactory,
  layoutFactory,
  speakerFactory,
  userFactory,
} from '../test/fixtures';
import { EventsModule } from './events.module';
import { EventsRepository } from './events.repository';

describe('EventsRepository (integration)', () => {
  let module: TestingModule;
  let repository: EventsRepository;
  const owner = userFactory.build();
  const layout = layoutFactory.build();
  const event = eventFactory.build({ ownerId: owner.id, layoutId: layout.id });
  const vipEvent = eventFactory.build({ ownerId: owner.id, isVip: true });
  const searchableEvent = eventFactory.build({
    ownerId: owner.id,
    title: 'Kubernetes Deep Dive Workshop',
    description: 'Hands-on container orchestration for platform teams.',
  });
  const searchableVipEvent = eventFactory.build({
    ownerId: owner.id,
    isVip: true,
    title: 'Executive Roundtable',
    description: 'An exclusive discussion on kubernetes adoption at scale.',
  });
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
    await dbService.db.insert(user).values(owner);
    await dbService.db.insert(speakers).values(speaker);
    await dbService.db.insert(layouts).values(layout);
    await dbService.db
      .insert(events)
      .values([event, vipEvent, searchableEvent, searchableVipEvent]);
    await dbService.db.insert(eventSessions).values(session);
  });

  afterAll(async () => {
    await module.close();
  });

  it('returns every seeded event from the database, VIP included', async () => {
    const result = await repository.findAll();

    expect(result.map((row) => row.id)).toEqual(expect.arrayContaining([event.id, vipEvent.id]));
  });

  it('excludes VIP events from the public query', async () => {
    const result = await repository.findPublic();

    expect(result.map((row) => row.id)).toEqual(
      expect.not.arrayContaining([vipEvent.id, searchableVipEvent.id]),
    );
  });

  it('matches a non-VIP event by a case-insensitive title substring, publicly', async () => {
    const result = await repository.findPublic('KUBERNETES');

    expect(result.map((row) => row.id)).toEqual([searchableEvent.id]);
  });

  it('matches an event by a substring in its description', async () => {
    const result = await repository.findAll('kubernetes');

    expect(result.map((row) => row.id)).toEqual(
      expect.arrayContaining([searchableEvent.id, searchableVipEvent.id]),
    );
  });

  it('excludes a VIP-only match from the public search', async () => {
    const result = await repository.findPublic('roundtable');

    expect(result).toEqual([]);
  });

  it('returns no rows for a query that matches nothing', async () => {
    const result = await repository.findPublic('nonexistent-term-xyz');

    expect(result).toEqual([]);
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

  it('reports an event id VIP flag', async () => {
    const nonVip = await repository.findVipFlag(event.id);
    const vip = await repository.findVipFlag(vipEvent.id);
    const notFound = await repository.findVipFlag('00000000-0000-0000-0000-000000000000');

    expect(nonVip).toBe(false);
    expect(vip).toBe(true);
    expect(notFound).toBeUndefined();
  });

  it('returns only events owned by the given owner', async () => {
    const result = await repository.findByOwner(owner.id);

    expect(result.map((row) => row.id)).toEqual(
      expect.arrayContaining([event.id, vipEvent.id, searchableEvent.id, searchableVipEvent.id]),
    );
  });

  it('returns an empty array for an owner with no events', async () => {
    const result = await repository.findByOwner('00000000-0000-0000-0000-000000000000');

    expect(result).toEqual([]);
  });

  it('returns the raw row for an existing event id', async () => {
    const result = await repository.findRawById(event.id);

    expect(result).toMatchObject({ id: event.id, ownerId: owner.id, title: event.title });
  });

  it('returns undefined from findRawById for an unknown event id', async () => {
    const result = await repository.findRawById('00000000-0000-0000-0000-000000000000');

    expect(result).toBeUndefined();
  });

  it('reports the owner id for an existing event', async () => {
    const result = await repository.findOwnerId(event.id);

    expect(result).toBe(owner.id);
  });

  it('returns undefined from findOwnerId for an unknown event id', async () => {
    const result = await repository.findOwnerId('00000000-0000-0000-0000-000000000000');

    expect(result).toBeUndefined();
  });

  it('creates an event owned by the given owner', async () => {
    const fields = eventFieldsFactory.build();

    const created = await repository.create(owner.id, fields);

    expect(created).toMatchObject({ ownerId: owner.id, ...fields });
  });

  it('updates an existing event owned by the given owner and returns the updated row', async () => {
    const created = await repository.create(owner.id, eventFieldsFactory.build());

    const updated = await repository.update(
      created.id,
      owner.id,
      eventFieldsFactory.build({ title: 'Updated Title' }),
    );

    expect(updated).toMatchObject({ id: created.id, title: 'Updated Title' });
  });

  it('returns undefined updating an unknown event id', async () => {
    const result = await repository.update(
      '00000000-0000-0000-0000-000000000000',
      owner.id,
      eventFieldsFactory.build(),
    );

    expect(result).toBeUndefined();
  });

  it('returns undefined updating an event owned by someone else', async () => {
    const created = await repository.create(owner.id, eventFieldsFactory.build());

    const result = await repository.update(
      created.id,
      '00000000-0000-0000-0000-000000000000',
      eventFieldsFactory.build(),
    );

    expect(result).toBeUndefined();
  });

  it('deletes an existing event owned by the given owner and reports success', async () => {
    const created = await repository.create(owner.id, eventFieldsFactory.build());

    const deleted = await repository.delete(created.id, owner.id);
    const found = await repository.findRawById(created.id);

    expect(deleted).toBe(true);
    expect(found).toBeUndefined();
  });

  it('reports failure deleting an unknown event id', async () => {
    const result = await repository.delete('00000000-0000-0000-0000-000000000000', owner.id);

    expect(result).toBe(false);
  });

  it('reports failure deleting an event owned by someone else', async () => {
    const created = await repository.create(owner.id, eventFieldsFactory.build());

    const result = await repository.delete(created.id, '00000000-0000-0000-0000-000000000000');
    const found = await repository.findRawById(created.id);

    expect(result).toBe(false);
    expect(found).toBeDefined();
  });
});
