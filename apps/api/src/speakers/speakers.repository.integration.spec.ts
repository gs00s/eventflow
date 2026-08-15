import { Test, type TestingModule } from '@nestjs/testing';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { DbService } from '../db/db.service';
import { speakers } from '../db/schemas';
import { SpeakersModule } from './speakers.module';
import { SpeakersRepository } from './speakers.repository';

describe('SpeakersRepository (integration)', () => {
  let module: TestingModule;
  let repository: SpeakersRepository;

  beforeAll(async () => {
    module = await Test.createTestingModule({ imports: [SpeakersModule] }).compile();
    repository = module.get(SpeakersRepository);

    const dbService = module.get(DbService);
    await dbService.db.delete(speakers);
    await dbService.db.insert(speakers).values({
      name: 'Dr. Jane Doe',
      title: 'VP of Engineering, Example Corp',
      bio: 'Expert in serverless architectures and cloud-native development.',
      image: '...',
    });
  });

  afterAll(async () => {
    await module.close();
  });

  it('returns the seeded speakers from the database', async () => {
    const result = await repository.findAll();

    expect(result).toEqual([expect.objectContaining({ name: 'Dr. Jane Doe' })]);
  });
});
