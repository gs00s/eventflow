import {
  Body,
  ConflictException,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  NotFoundException,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import type {
  Event,
  EventDetail,
  EventInput,
  OwnedEvent,
  RegistrationStatus,
} from '@eventflow/shared-types';
import { AllowAnonymous, Session, type UserSession } from '@thallesp/nestjs-better-auth';
import type { auth } from '../auth/auth';
import { eventsRequestsCounter } from '../metrics/events-requests.counter';
import { EventInputDto } from './dto/event-input.dto';
import { EventsService } from './events.service';

@Controller('events')
export class EventsController {
  constructor(private readonly eventsService: EventsService) {}

  @AllowAnonymous()
  @Get()
  findAll(@Query('q') q?: string): Promise<Event[]> {
    eventsRequestsCounter.inc({ tier: 'standard' });

    return this.eventsService.findPublic(q);
  }

  // Must be registered before ':id', or Nest matches "vip" as an :id value.
  @Get('vip')
  async findAllVip(
    @Session() session: UserSession<typeof auth>,
    @Query('q') q?: string,
  ): Promise<Event[]> {
    eventsRequestsCounter.inc({ tier: 'vip' });
    if (!session.user.isVip) throw new ForbiddenException();

    return this.eventsService.findAllForVip(q);
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

  // Must be registered before ':id', or Nest matches "mine" as an :id value.
  @Get('mine')
  findMine(@Session() session: UserSession<typeof auth>): Promise<OwnedEvent[]> {
    return this.eventsService.findMine(session.user.id);
  }

  @Get('mine/:id')
  async findMineById(
    @Param('id') id: string,
    @Session() session: UserSession<typeof auth>,
  ): Promise<OwnedEvent> {
    const result = await this.eventsService.findMineById(id);
    if (!result) throw new NotFoundException();
    if (result.ownerId !== session.user.id) throw new ForbiddenException();

    return result.event;
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

  @Post()
  create(
    @Body() body: EventInputDto,
    @Session() session: UserSession<typeof auth>,
  ): Promise<OwnedEvent> {
    return this.eventsService.create(session.user.id, body as EventInput, session.user.isVip);
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() body: EventInputDto,
    @Session() session: UserSession<typeof auth>,
  ): Promise<OwnedEvent> {
    const event = await this.eventsService.update(
      id,
      session.user.id,
      body as EventInput,
      session.user.isVip,
    );
    if (event) return event;

    const ownerId = await this.eventsService.findOwnerId(id);
    if (ownerId === undefined) throw new NotFoundException();
    throw new ForbiddenException();
  }

  @Delete(':id')
  async remove(
    @Param('id') id: string,
    @Session() session: UserSession<typeof auth>,
  ): Promise<void> {
    const deleted = await this.eventsService.delete(id, session.user.id);
    if (deleted) return;

    const ownerId = await this.eventsService.findOwnerId(id);
    if (ownerId === undefined) throw new NotFoundException();
    throw new ForbiddenException();
  }
}
