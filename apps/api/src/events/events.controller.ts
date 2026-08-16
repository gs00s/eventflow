import {
  ConflictException,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  NotFoundException,
  Param,
  Post,
} from '@nestjs/common';
import type { Event, EventDetail, RegistrationStatus } from '@eventflow/shared-types';
import { AllowAnonymous, Session, type UserSession } from '@thallesp/nestjs-better-auth';
import type { auth } from '../auth/auth';
import { EventsService } from './events.service';

@Controller('events')
export class EventsController {
  constructor(private readonly eventsService: EventsService) {}

  @AllowAnonymous()
  @Get()
  findAll(): Promise<Event[]> {
    return this.eventsService.findPublic();
  }

  // Must be registered before ':id', or Nest matches "vip" as an :id value.
  @Get('vip')
  async findAllVip(@Session() session: UserSession<typeof auth>): Promise<Event[]> {
    if (!session.user.isVip) throw new ForbiddenException();

    return this.eventsService.findAllForVip();
  }

  @Get('vip/:id')
  async findOneVip(
    @Param('id') id: string,
    @Session() session: UserSession<typeof auth>,
  ): Promise<EventDetail> {
    if (!session.user.isVip) throw new ForbiddenException();

    const event = await this.eventsService.findById(id);
    if (!event) throw new NotFoundException();
    if (!event.isVip) throw new ForbiddenException();

    return event;
  }

  @AllowAnonymous()
  @Get(':id')
  async findOne(@Param('id') id: string): Promise<EventDetail> {
    const event = await this.eventsService.findById(id);
    if (!event) throw new NotFoundException();
    if (event.isVip) throw new ForbiddenException();

    return event;
  }

  @Get(':id/register')
  async registrationStatus(
    @Param('id') id: string,
    @Session() session: UserSession<typeof auth>,
  ): Promise<RegistrationStatus> {
    const isRegistered = await this.eventsService.isRegistered(id, session.user.id);

    return { isRegistered };
  }

  @Post(':id/register')
  async register(
    @Param('id') id: string,
    @Session() session: UserSession<typeof auth>,
  ): Promise<void> {
    const isVip = await this.eventsService.findVipFlag(id);
    if (isVip === undefined) throw new NotFoundException();
    if (isVip && !session.user.isVip) throw new ForbiddenException();

    const created = await this.eventsService.register(session.user.id, id);
    if (!created) throw new ConflictException();
  }

  @Delete(':id/register')
  async unregister(
    @Param('id') id: string,
    @Session() session: UserSession<typeof auth>,
  ): Promise<void> {
    const deleted = await this.eventsService.unregister(session.user.id, id);
    if (!deleted) throw new NotFoundException();
  }
}
