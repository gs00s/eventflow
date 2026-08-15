import { Test } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import { eventFactory } from '../test/fixtures';
import { EventsController } from './events.controller';
import { EventsModule } from './events.module';
import { EventsRepository } from './events.repository';

describe('EventsController', () => {
  it('resolves via Nest DI and lists events', async () => {
    const event = eventFactory.build();
    const module = await Test.createTestingModule({ imports: [EventsModule] }).compile();
    vi.spyOn(module.get(EventsRepository), 'findAll').mockResolvedValueOnce([event]);
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
      },
    ]);
  });

  it('throws NotFoundException when the event does not exist', async () => {
    const module = await Test.createTestingModule({ imports: [EventsModule] }).compile();
    vi.spyOn(module.get(EventsRepository), 'findById').mockResolvedValueOnce(undefined);
    const controller = module.get(EventsController);

    await expect(controller.findOne('missing-id')).rejects.toThrow(NotFoundException);
  });
});
