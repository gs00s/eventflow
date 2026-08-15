import { Controller, Get, NotFoundException, Param } from '@nestjs/common';
import type { Speaker, SpeakerDetail } from '@eventflow/shared-types';
import { AllowAnonymous } from '@thallesp/nestjs-better-auth';
import { SpeakersService } from './speakers.service';

@AllowAnonymous()
@Controller('speakers')
export class SpeakersController {
  constructor(private readonly speakersService: SpeakersService) {}

  @Get()
  findAll(): Promise<Speaker[]> {
    return this.speakersService.findAll();
  }

  @Get(':id')
  async findOne(@Param('id') id: string): Promise<SpeakerDetail> {
    const speaker = await this.speakersService.findById(id);
    if (!speaker) throw new NotFoundException();

    return speaker;
  }
}
