import { Test } from '@nestjs/testing';
import { describe, expect, it, vi } from 'vitest';
import { SpeakersModule } from './speakers.module';
import { SpeakersRepository } from './speakers.repository';
import { SpeakersService } from './speakers.service';

const DB_ROW = {
  id: 'dfed351e-0953-4d31-9856-1f56bcbfe939',
  name: 'Dr. Jane Doe',
  title: 'VP of Engineering, Example Corp',
  bio: 'Expert in serverless architectures and cloud-native development.',
  image: '...',
};

describe('SpeakersService', () => {
  it('maps repository rows to speaker DTOs', async () => {
    const module = await Test.createTestingModule({ imports: [SpeakersModule] }).compile();
    vi.spyOn(module.get(SpeakersRepository), 'findAll').mockResolvedValue([DB_ROW]);
    const service = module.get(SpeakersService);

    const result = await service.findAll();

    expect(result).toEqual([DB_ROW]);
  });
});
