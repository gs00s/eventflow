import { Test } from '@nestjs/testing';
import { describe, expect, it, vi } from 'vitest';
import { speakerFactory } from '../test/fixtures';
import { SpeakersModule } from './speakers.module';
import { SpeakersRepository } from './speakers.repository';
import { SpeakersService } from './speakers.service';

describe('SpeakersService', () => {
  it('maps repository rows to speaker DTOs', async () => {
    const row = speakerFactory.build();
    const module = await Test.createTestingModule({ imports: [SpeakersModule] }).compile();
    vi.spyOn(module.get(SpeakersRepository), 'findAll').mockResolvedValue([row]);
    const service = module.get(SpeakersService);

    const result = await service.findAll();

    expect(result).toEqual([
      { id: row.id, name: row.name, title: row.title, bio: row.bio, image: row.image },
    ]);
  });
});
