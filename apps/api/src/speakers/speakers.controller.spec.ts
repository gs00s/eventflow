import { NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { describe, expect, it, vi } from 'vitest';
import { speakerFactory } from '../test/fixtures';
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
});
