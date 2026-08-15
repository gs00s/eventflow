import { Test } from '@nestjs/testing';
import { describe, expect, it, vi } from 'vitest';
import { speakerFactory } from '../test/fixtures';
import { SpeakersController } from './speakers.controller';
import { SpeakersModule } from './speakers.module';
import { SpeakersRepository } from './speakers.repository';

describe('SpeakersController', () => {
  it('resolves via Nest DI and lists speakers', async () => {
    const module = await Test.createTestingModule({ imports: [SpeakersModule] }).compile();
    vi.spyOn(module.get(SpeakersRepository), 'findAll').mockResolvedValueOnce([
      speakerFactory.build(),
    ]);
    const controller = module.get(SpeakersController);

    const result = await controller.findAll();

    expect(result).toHaveLength(1);
  });
});
