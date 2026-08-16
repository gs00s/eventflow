import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { describe, expect, it, vi } from 'vitest';
import { eventFactory, eventSessionFactory, sessionFor, speakerFactory } from '../test/fixtures';
import { SpeakersController } from './speakers.controller';
import { SpeakersModule } from './speakers.module';
import { SpeakersRepository } from './speakers.repository';

describe('SpeakersController', () => {
  it('resolves via Nest DI and lists speakers', async () => {
    const speaker = speakerFactory.build();
    const module = await Test.createTestingModule({ imports: [SpeakersModule] }).compile();
    vi.spyOn(module.get(SpeakersRepository), 'findAll').mockResolvedValueOnce([speaker]);
    const controller = module.get(SpeakersController);

    const result = await controller.findAll();

    expect(result).toEqual([
      {
        id: speaker.id,
        name: speaker.name,
        title: speaker.title,
        bio: speaker.bio,
        image: speaker.image,
      },
    ]);
  });

  it('throws NotFoundException when the speaker does not exist', async () => {
    const module = await Test.createTestingModule({ imports: [SpeakersModule] }).compile();
    vi.spyOn(module.get(SpeakersRepository), 'findById').mockResolvedValueOnce(undefined);
    const controller = module.get(SpeakersController);

    await expect(controller.findOne('missing-id')).rejects.toThrow(NotFoundException);
  });

  it('returns the speaker for a known id', async () => {
    const speaker = speakerFactory.build();
    const module = await Test.createTestingModule({ imports: [SpeakersModule] }).compile();
    vi.spyOn(module.get(SpeakersRepository), 'findById').mockResolvedValueOnce(speaker);
    const controller = module.get(SpeakersController);

    const result = await controller.findOne(speaker.id);

    expect(result.id).toBe(speaker.id);
  });

  it('throws NotFoundException listing events for a speaker that does not exist', async () => {
    const module = await Test.createTestingModule({ imports: [SpeakersModule] }).compile();
    vi.spyOn(module.get(SpeakersRepository), 'exists').mockResolvedValueOnce(false);
    const controller = module.get(SpeakersController);

    await expect(controller.findEvents('missing-id')).rejects.toThrow(NotFoundException);
  });

  it('lists a speaker’s public events, VIP events excluded', async () => {
    const speaker = speakerFactory.build();
    const publicEvent = eventFactory.build();
    const vipEvent = eventFactory.build({ isVip: true });
    const publicSession = eventSessionFactory.build({
      eventId: publicEvent.id,
      speakerId: speaker.id,
    });
    const vipSession = eventSessionFactory.build({ eventId: vipEvent.id, speakerId: speaker.id });
    const module = await Test.createTestingModule({ imports: [SpeakersModule] }).compile();
    vi.spyOn(module.get(SpeakersRepository), 'exists').mockResolvedValueOnce(true);
    vi.spyOn(module.get(SpeakersRepository), 'findEvents').mockResolvedValueOnce([
      { ...publicSession, event: publicEvent },
      { ...vipSession, event: vipEvent },
    ]);
    const controller = module.get(SpeakersController);

    const result = await controller.findEvents(speaker.id);

    expect(result).toEqual([
      { id: publicEvent.id, title: publicEvent.title, date: publicEvent.date },
    ]);
  });

  it('throws ForbiddenException listing VIP events for a non-VIP viewer', async () => {
    const module = await Test.createTestingModule({ imports: [SpeakersModule] }).compile();
    const controller = module.get(SpeakersController);

    await expect(controller.findEventsVip('some-id', sessionFor({ isVip: false }))).rejects.toThrow(
      ForbiddenException,
    );
  });

  it('throws NotFoundException listing VIP events for a speaker that does not exist', async () => {
    const module = await Test.createTestingModule({ imports: [SpeakersModule] }).compile();
    vi.spyOn(module.get(SpeakersRepository), 'exists').mockResolvedValueOnce(false);
    const controller = module.get(SpeakersController);

    await expect(
      controller.findEventsVip('missing-id', sessionFor({ isVip: true })),
    ).rejects.toThrow(NotFoundException);
  });

  it('lists every event for a VIP viewer, VIP events included', async () => {
    const speaker = speakerFactory.build();
    const publicEvent = eventFactory.build();
    const vipEvent = eventFactory.build({ isVip: true });
    const publicSession = eventSessionFactory.build({
      eventId: publicEvent.id,
      speakerId: speaker.id,
    });
    const vipSession = eventSessionFactory.build({ eventId: vipEvent.id, speakerId: speaker.id });
    const module = await Test.createTestingModule({ imports: [SpeakersModule] }).compile();
    vi.spyOn(module.get(SpeakersRepository), 'exists').mockResolvedValueOnce(true);
    vi.spyOn(module.get(SpeakersRepository), 'findEvents').mockResolvedValueOnce([
      { ...publicSession, event: publicEvent },
      { ...vipSession, event: vipEvent },
    ]);
    const controller = module.get(SpeakersController);

    const result = await controller.findEventsVip(speaker.id, sessionFor({ isVip: true }));

    expect(result.map((event) => event.id)).toEqual(
      expect.arrayContaining([publicEvent.id, vipEvent.id]),
    );
  });
});
