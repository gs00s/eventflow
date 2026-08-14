import { Controller, Get } from '@nestjs/common';
import type { Speaker } from '@eventflow/shared-types';
import { SpeakersService } from './speakers.service';

@Controller('speakers')
export class SpeakersController {
  constructor(private readonly speakersService: SpeakersService) {}

  @Get()
  findAll(): Promise<Speaker[]> {
    return this.speakersService.findAll();
  }
}
