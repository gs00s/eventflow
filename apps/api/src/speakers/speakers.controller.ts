import { Controller, ForbiddenException, Get, NotFoundException, Param } from '@nestjs/common';
import type { Speaker, SpeakerEvent } from '@eventflow/shared-types';
import { AllowAnonymous, Session, type UserSession } from '@thallesp/nestjs-better-auth';
import type { auth } from '../auth/auth';
import { SpeakersService } from './speakers.service';

@Controller('speakers')
export class SpeakersController {
  constructor(private readonly speakersService: SpeakersService) {}

  @AllowAnonymous()
  @Get()
  findAll(): Promise<Speaker[]> {
    return this.speakersService.findAll();
  }

  @AllowAnonymous()
  @Get(':id')
  async findOne(@Param('id') id: string): Promise<Speaker> {
    const speaker = await this.speakersService.findById(id);
    if (!speaker) throw new NotFoundException();

    return speaker;
  }

  @AllowAnonymous()
  @Get(':id/events')
  async findEvents(@Param('id') id: string): Promise<SpeakerEvent[]> {
    const exists = await this.speakersService.exists(id);
    if (!exists) throw new NotFoundException();

    return this.speakersService.findPublicEvents(id);
  }

  @Get(':id/events/vip')
  async findEventsVip(
    @Param('id') id: string,
    @Session() session: UserSession<typeof auth>,
  ): Promise<SpeakerEvent[]> {
    if (!session.user.isVip) throw new ForbiddenException();

    const exists = await this.speakersService.exists(id);
    if (!exists) throw new NotFoundException();

    return this.speakersService.findAllEvents(id);
  }
}
