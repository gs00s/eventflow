import { Test } from '@nestjs/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import { SpeakersController } from './speakers.controller';
import { SpeakersService } from './speakers.service';

describe('SpeakersController', () => {
  let controller: SpeakersController;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      controllers: [SpeakersController],
      providers: [SpeakersService],
    }).compile();

    controller = module.get(SpeakersController);
  });

  it('resolves via Nest DI and lists speakers', () => {
    expect(controller.findAll()).toHaveLength(1);
  });
});
