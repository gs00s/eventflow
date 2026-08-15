import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { describe, expect, it, vi } from 'vitest';
import { eventFactory, sessionFor } from '../test/fixtures';
import { EventsController } from './events.controller';
import { EventsModule } from './events.module';
import { EventsRepository } from './events.repository';

describe('EventsController', () => {
  it('resolves via Nest DI and lists public events', async () => {
    const event = eventFactory.build();
    const module = await Test.createTestingModule({ imports: [EventsModule] }).compile();
    vi.spyOn(module.get(EventsRepository), 'findPublic').mockResolvedValueOnce([event]);
    const controller = module.get(EventsController);

    const result = await controller.findAll();

    expect(result).toEqual([
      {
        id: event.id,
        title: event.title,
        subtitle: event.subtitle,
        date: event.date,
        location: {
          city: event.locationCity,
          venue: event.locationVenue,
          address: event.locationAddress,
        },
        hero: { image: event.heroImage, cta: event.heroCta },
        isVip: event.isVip,
      },
    ]);
  });

  it('throws NotFoundException when the event does not exist', async () => {
    const module = await Test.createTestingModule({ imports: [EventsModule] }).compile();
    vi.spyOn(module.get(EventsRepository), 'findById').mockResolvedValueOnce(undefined);
    const controller = module.get(EventsController);

    await expect(controller.findOne('missing-id')).rejects.toThrow(NotFoundException);
  });

  it('throws ForbiddenException for a VIP event on the public route', async () => {
    const event = eventFactory.build({ isVip: true });
    const module = await Test.createTestingModule({ imports: [EventsModule] }).compile();
    vi.spyOn(module.get(EventsRepository), 'findById').mockResolvedValueOnce({
      ...event,
      sessions: [],
      layout: null,
    });
    const controller = module.get(EventsController);

    await expect(controller.findOne(event.id)).rejects.toThrow(ForbiddenException);
  });

  it('throws ForbiddenException listing the VIP feed as a non-VIP user', async () => {
    const module = await Test.createTestingModule({ imports: [EventsModule] }).compile();
    const controller = module.get(EventsController);

    await expect(controller.findAllVip(sessionFor({ isVip: false }))).rejects.toThrow(
      ForbiddenException,
    );
  });

  it('lists every event via the VIP feed for a VIP user', async () => {
    const event = eventFactory.build({ isVip: true });
    const module = await Test.createTestingModule({ imports: [EventsModule] }).compile();
    vi.spyOn(module.get(EventsRepository), 'findAll').mockResolvedValueOnce([event]);
    const controller = module.get(EventsController);

    const result = await controller.findAllVip(sessionFor({ isVip: true }));

    expect(result).toEqual([
      {
        id: event.id,
        title: event.title,
        subtitle: event.subtitle,
        date: event.date,
        location: {
          city: event.locationCity,
          venue: event.locationVenue,
          address: event.locationAddress,
        },
        hero: { image: event.heroImage, cta: event.heroCta },
        isVip: event.isVip,
      },
    ]);
  });

  it('throws ForbiddenException fetching a VIP event detail as a non-VIP user', async () => {
    const module = await Test.createTestingModule({ imports: [EventsModule] }).compile();
    const controller = module.get(EventsController);

    await expect(controller.findOneVip('some-id', sessionFor({ isVip: false }))).rejects.toThrow(
      ForbiddenException,
    );
  });

  it('returns the event detail via the VIP route for a VIP user', async () => {
    const event = eventFactory.build({ isVip: true });
    const module = await Test.createTestingModule({ imports: [EventsModule] }).compile();
    vi.spyOn(module.get(EventsRepository), 'findById').mockResolvedValueOnce({
      ...event,
      sessions: [],
      layout: null,
    });
    const controller = module.get(EventsController);

    const result = await controller.findOneVip(event.id, sessionFor({ isVip: true }));

    expect(result.id).toBe(event.id);
  });
});
