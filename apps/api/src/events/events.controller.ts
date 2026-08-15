import { Controller, Get, NotFoundException, Param } from '@nestjs/common';
import type { Event, EventDetail } from '@eventflow/shared-types';
import { AllowAnonymous } from '@thallesp/nestjs-better-auth';
import { EventsService } from './events.service';

@AllowAnonymous()
@Controller('events')
export class EventsController {
  constructor(private readonly eventsService: EventsService) {}

  @Get()
  findAll(): Promise<Event[]> {
    return this.eventsService.findAll();
  }

  @Get(':id')
  async findOne(@Param('id') id: string): Promise<EventDetail> {
    const event = await this.eventsService.findById(id);
    if (!event) throw new NotFoundException();

    return event;
  }
}
