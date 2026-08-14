import { Test } from '@nestjs/testing';
import { describe, expect, it, vi } from 'vitest';
import { SpeakersController } from './speakers.controller';
import { SpeakersModule } from './speakers.module';
import { SpeakersRepository } from './speakers.repository';

const DB_ROW = {
  id: 'dfed351e-0953-4d31-9856-1f56bcbfe939',
  name: 'Dr. Jane Doe',
  title: 'VP of Engineering, Example Corp',
  bio: 'Expert in serverless architectures and cloud-native development.',
  image: '...',
};

describe('SpeakersController', () => {
  it('resolves via Nest DI and lists speakers', async () => {
    const module = await Test.createTestingModule({ imports: [SpeakersModule] }).compile();
    vi.spyOn(module.get(SpeakersRepository), 'findAll').mockResolvedValueOnce([DB_ROW]);
    const controller = module.get(SpeakersController);

    const result = await controller.findAll();

    expect(result).toHaveLength(1);
  });
});
