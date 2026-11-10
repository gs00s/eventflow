import { Test } from '@nestjs/testing';
import { describe, expect, it, vi } from 'vitest';
import {
  eventFactory,
  eventInputFactory,
  eventSessionFactory,
  layoutFactory,
  speakerFactory,
} from '../test/fixtures';
import { EventsModule } from './events.module';
import { EventsRepository } from './events.repository';
import { EventsService } from './events.service';
import { RegistrationsRepository } from './registrations.repository';

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

  it('passes the search query through to the public repository call', async () => {
    const row = eventFactory.build();
    const module = await Test.createTestingModule({ imports: [EventsModule] }).compile();
    const repoSpy = vi.spyOn(module.get(EventsRepository), 'findPublic').mockResolvedValue([row]);
    const service = module.get(EventsService);

    await service.findPublic('kubernetes');

    expect(repoSpy).toHaveBeenCalledWith('kubernetes');
  });

  it('passes the search query through to the VIP repository call', async () => {
    const row = eventFactory.build();
    const module = await Test.createTestingModule({ imports: [EventsModule] }).compile();
    const repoSpy = vi.spyOn(module.get(EventsRepository), 'findAll').mockResolvedValue([row]);
    const service = module.get(EventsService);

    await service.findAllForVip('kubernetes');

    expect(repoSpy).toHaveBeenCalledWith('kubernetes');
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

  it('reports an event id VIP flag', async () => {
    const module = await Test.createTestingModule({ imports: [EventsModule] }).compile();
    vi.spyOn(module.get(EventsRepository), 'findVipFlag').mockResolvedValueOnce(true);
    const service = module.get(EventsService);

    const result = await service.findVipFlag('event-id');

    expect(result).toBe(true);
  });

  it('creates a registration for the viewer and event', async () => {
    const module = await Test.createTestingModule({ imports: [EventsModule] }).compile();
    vi.spyOn(module.get(RegistrationsRepository), 'create').mockResolvedValueOnce(true);
    const service = module.get(EventsService);

    const result = await service.register('viewer-id', 'event-id');

    expect(result).toBe(true);
  });

  it('reports a failed registration when one already exists', async () => {
    const module = await Test.createTestingModule({ imports: [EventsModule] }).compile();
    vi.spyOn(module.get(RegistrationsRepository), 'create').mockResolvedValueOnce(false);
    const service = module.get(EventsService);

    const result = await service.register('viewer-id', 'event-id');

    expect(result).toBe(false);
  });

  it('reports whether a viewer is registered for an event', async () => {
    const module = await Test.createTestingModule({ imports: [EventsModule] }).compile();
    vi.spyOn(module.get(RegistrationsRepository), 'existsForUser').mockResolvedValueOnce(true);
    const service = module.get(EventsService);

    const result = await service.isRegistered('event-id', 'viewer-id');

    expect(result).toBe(true);
  });

  it('deletes a registration for the viewer and event', async () => {
    const module = await Test.createTestingModule({ imports: [EventsModule] }).compile();
    vi.spyOn(module.get(RegistrationsRepository), 'delete').mockResolvedValueOnce(true);
    const service = module.get(EventsService);

    const result = await service.unregister('viewer-id', 'event-id');

    expect(result).toBe(true);
  });

  it('reports a failed unregister when no registration exists', async () => {
    const module = await Test.createTestingModule({ imports: [EventsModule] }).compile();
    vi.spyOn(module.get(RegistrationsRepository), 'delete').mockResolvedValueOnce(false);
    const service = module.get(EventsService);

    const result = await service.unregister('viewer-id', 'event-id');

    expect(result).toBe(false);
  });

  it('lists events owned by the given owner, mapped to OwnedEvent', async () => {
    const row = eventFactory.build();
    const module = await Test.createTestingModule({ imports: [EventsModule] }).compile();
    vi.spyOn(module.get(EventsRepository), 'findByOwner').mockResolvedValueOnce([row]);
    const service = module.get(EventsService);

    const result = await service.findMine(row.ownerId);

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
        description: row.description,
        organizer: { name: row.organizerName, image: row.organizerImage },
      },
    ]);
  });

  it('resolves findMineById to the mapped event and its owner id', async () => {
    const row = eventFactory.build();
    const module = await Test.createTestingModule({ imports: [EventsModule] }).compile();
    vi.spyOn(module.get(EventsRepository), 'findRawById').mockResolvedValueOnce(row);
    const service = module.get(EventsService);

    const result = await service.findMineById(row.id);

    expect(result).toEqual({
      event: expect.objectContaining({ id: row.id, title: row.title }),
      ownerId: row.ownerId,
    });
  });

  it('returns undefined from findMineById for an unknown event id', async () => {
    const module = await Test.createTestingModule({ imports: [EventsModule] }).compile();
    vi.spyOn(module.get(EventsRepository), 'findRawById').mockResolvedValueOnce(undefined);
    const service = module.get(EventsService);

    const result = await service.findMineById('missing-id');

    expect(result).toBeUndefined();
  });

  it('reports the owner id for an event', async () => {
    const module = await Test.createTestingModule({ imports: [EventsModule] }).compile();
    vi.spyOn(module.get(EventsRepository), 'findOwnerId').mockResolvedValueOnce('owner-id');
    const service = module.get(EventsService);

    const result = await service.findOwnerId('event-id');

    expect(result).toBe('owner-id');
  });

  it('creates an event, passing the VIP flag through for an allowed owner', async () => {
    const row = eventFactory.build({ isVip: true });
    const module = await Test.createTestingModule({ imports: [EventsModule] }).compile();
    const createSpy = vi.spyOn(module.get(EventsRepository), 'create').mockResolvedValueOnce(row);
    const service = module.get(EventsService);
    const input = eventInputFactory.build({ isVip: true });

    const result = await service.create('owner-id', input, true);

    expect(createSpy).toHaveBeenCalledWith('owner-id', expect.objectContaining({ isVip: true }));
    expect(result.isVip).toBe(true);
  });

  it('forces isVip false creating an event for a non-VIP owner', async () => {
    const row = eventFactory.build({ isVip: false });
    const module = await Test.createTestingModule({ imports: [EventsModule] }).compile();
    const createSpy = vi.spyOn(module.get(EventsRepository), 'create').mockResolvedValueOnce(row);
    const service = module.get(EventsService);
    const input = eventInputFactory.build({ isVip: true });

    await service.create('owner-id', input, false);

    expect(createSpy).toHaveBeenCalledWith('owner-id', expect.objectContaining({ isVip: false }));
  });

  it('updates an owned event and maps the result', async () => {
    const row = eventFactory.build({ title: 'Updated Title' });
    const module = await Test.createTestingModule({ imports: [EventsModule] }).compile();
    const updateSpy = vi.spyOn(module.get(EventsRepository), 'update').mockResolvedValueOnce(row);
    const service = module.get(EventsService);
    const input = eventInputFactory.build();

    const result = await service.update(row.id, 'owner-id', input, true);

    expect(updateSpy).toHaveBeenCalledWith(row.id, 'owner-id', expect.objectContaining({}));
    expect(result?.title).toBe('Updated Title');
  });

  it('returns undefined updating an unknown or unowned event id', async () => {
    const module = await Test.createTestingModule({ imports: [EventsModule] }).compile();
    vi.spyOn(module.get(EventsRepository), 'update').mockResolvedValueOnce(undefined);
    const service = module.get(EventsService);

    const result = await service.update('missing-id', 'owner-id', eventInputFactory.build(), true);

    expect(result).toBeUndefined();
  });

  it('deletes an owned event via the repository', async () => {
    const module = await Test.createTestingModule({ imports: [EventsModule] }).compile();
    const deleteSpy = vi.spyOn(module.get(EventsRepository), 'delete').mockResolvedValueOnce(true);
    const service = module.get(EventsService);

    const result = await service.delete('event-id', 'owner-id');

    expect(deleteSpy).toHaveBeenCalledWith('event-id', 'owner-id');
    expect(result).toBe(true);
  });
});
