import { Test, type TestingModule } from '@nestjs/testing';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { DbService } from '../db/db.service';
import { speakers } from '../db/schemas';
import { speakerFactory } from '../test/fixtures';
import { SpeakersModule } from './speakers.module';
import { SpeakersRepository } from './speakers.repository';

describe('SpeakersRepository (integration)', () => {
  let module: TestingModule;
  let repository: SpeakersRepository;
  const speaker = speakerFactory.build();

  beforeAll(async () => {
    module = await Test.createTestingModule({ imports: [SpeakersModule] }).compile();
    repository = module.get(SpeakersRepository);

    const dbService = module.get(DbService);
    await dbService.db.delete(speakers);
    await dbService.db.insert(speakers).values(speaker);
  });

  afterAll(async () => {
    await module.close();
  });

  it('returns the seeded speakers from the database', async () => {
    const result = await repository.findAll();

    expect(result).toEqual([expect.objectContaining({ name: speaker.name })]);
  });
});
