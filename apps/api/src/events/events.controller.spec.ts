import { ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { getToken } from '@willsoto/nestjs-prometheus';
import type { Counter } from 'prom-client';
import { describe, expect, it, vi } from 'vitest';
import { eventFactory, sessionFor } from '../test/fixtures';
import { EventsController } from './events.controller';
import { EventsModule } from './events.module';
import { EventsRepository } from './events.repository';
import { RegistrationsRepository } from './registrations.repository';

describe('EventsController', () => {
  it('increments the standard-tier events counter listing public events', async () => {
    const module = await Test.createTestingModule({ imports: [EventsModule] }).compile();
    vi.spyOn(module.get(EventsRepository), 'findPublic').mockResolvedValueOnce([]);
    const counter = module.get<Counter<'tier'>>(getToken('events_requests_total'));
    const incSpy = vi.spyOn(counter, 'inc');
    const controller = module.get(EventsController);

    await controller.findAll();

    expect(incSpy).toHaveBeenCalledWith({ tier: 'standard' });
  });

  it('increments the vip-tier events counter listing the VIP feed, even when forbidden', async () => {
    const module = await Test.createTestingModule({ imports: [EventsModule] }).compile();
    const counter = module.get<Counter<'tier'>>(getToken('events_requests_total'));
    const incSpy = vi.spyOn(counter, 'inc');
    const controller = module.get(EventsController);

    await expect(controller.findAllVip(sessionFor({ isVip: false }))).rejects.toThrow(
      ForbiddenException,
    );

    expect(incSpy).toHaveBeenCalledWith({ tier: 'vip' });
  });

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

  it('throws ForbiddenException fetching a non-VIP event via the VIP route', async () => {
    const event = eventFactory.build({ isVip: false });
    const module = await Test.createTestingModule({ imports: [EventsModule] }).compile();
    vi.spyOn(module.get(EventsRepository), 'findById').mockResolvedValueOnce({
      ...event,
      sessions: [],
      layout: null,
    });
    const controller = module.get(EventsController);

    await expect(controller.findOneVip(event.id, sessionFor({ isVip: true }))).rejects.toThrow(
      ForbiddenException,
    );
  });

  it('reports whether the viewer is registered for an event', async () => {
    const module = await Test.createTestingModule({ imports: [EventsModule] }).compile();
    vi.spyOn(module.get(RegistrationsRepository), 'existsForUser').mockResolvedValueOnce(true);
    const controller = module.get(EventsController);

    const result = await controller.registrationStatus('event-id', sessionFor());

    expect(result).toEqual({ isRegistered: true });
  });

  it('throws NotFoundException registering for an event that does not exist', async () => {
    const module = await Test.createTestingModule({ imports: [EventsModule] }).compile();
    vi.spyOn(module.get(EventsRepository), 'findVipFlag').mockResolvedValueOnce(undefined);
    const controller = module.get(EventsController);

    await expect(controller.register('missing-id', sessionFor())).rejects.toThrow(
      NotFoundException,
    );
  });

  it('throws ForbiddenException registering a non-VIP viewer for a VIP event', async () => {
    const event = eventFactory.build({ isVip: true });
    const module = await Test.createTestingModule({ imports: [EventsModule] }).compile();
    vi.spyOn(module.get(EventsRepository), 'findVipFlag').mockResolvedValueOnce(true);
    const controller = module.get(EventsController);

    await expect(controller.register(event.id, sessionFor({ isVip: false }))).rejects.toThrow(
      ForbiddenException,
    );
  });

  it('throws ConflictException registering for an event the viewer already registered for', async () => {
    const event = eventFactory.build();
    const module = await Test.createTestingModule({ imports: [EventsModule] }).compile();
    vi.spyOn(module.get(EventsRepository), 'findVipFlag').mockResolvedValueOnce(false);
    vi.spyOn(module.get(RegistrationsRepository), 'create').mockResolvedValueOnce(false);
    const controller = module.get(EventsController);

    await expect(controller.register(event.id, sessionFor())).rejects.toThrow(ConflictException);
  });

  it('registers the viewer for an event', async () => {
    const event = eventFactory.build();
    const module = await Test.createTestingModule({ imports: [EventsModule] }).compile();
    vi.spyOn(module.get(EventsRepository), 'findVipFlag').mockResolvedValueOnce(false);
    vi.spyOn(module.get(RegistrationsRepository), 'create').mockResolvedValueOnce(true);
    const controller = module.get(EventsController);

    await expect(controller.register(event.id, sessionFor())).resolves.toBeUndefined();
  });

  it('registers a VIP viewer for a VIP event', async () => {
    const event = eventFactory.build({ isVip: true });
    const module = await Test.createTestingModule({ imports: [EventsModule] }).compile();
    vi.spyOn(module.get(EventsRepository), 'findVipFlag').mockResolvedValueOnce(true);
    vi.spyOn(module.get(RegistrationsRepository), 'create').mockResolvedValueOnce(true);
    const controller = module.get(EventsController);

    await expect(
      controller.register(event.id, sessionFor({ isVip: true })),
    ).resolves.toBeUndefined();
  });

  it('throws NotFoundException unregistering when no registration exists', async () => {
    const module = await Test.createTestingModule({ imports: [EventsModule] }).compile();
    vi.spyOn(module.get(RegistrationsRepository), 'delete').mockResolvedValueOnce(false);
    const controller = module.get(EventsController);

    await expect(controller.unregister('event-id', sessionFor())).rejects.toThrow(
      NotFoundException,
    );
  });

  it('unregisters the viewer from an event', async () => {
    const module = await Test.createTestingModule({ imports: [EventsModule] }).compile();
    vi.spyOn(module.get(RegistrationsRepository), 'delete').mockResolvedValueOnce(true);
    const controller = module.get(EventsController);

    await expect(controller.unregister('event-id', sessionFor())).resolves.toBeUndefined();
  });
});
