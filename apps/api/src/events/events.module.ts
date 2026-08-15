import { Module } from '@nestjs/common';
import { DbModule } from '../db/db.module';
import { EventsController } from './events.controller';
import { EventsRepository } from './events.repository';
import { EventsService } from './events.service';
import { RegistrationsRepository } from './registrations.repository';

@Module({
  imports: [DbModule],
  controllers: [EventsController],
  providers: [EventsService, EventsRepository, RegistrationsRepository],
})
export class EventsModule {}
