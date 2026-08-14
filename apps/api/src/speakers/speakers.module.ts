import { Module } from '@nestjs/common';
import { DbModule } from '../db/db.module';
import { SpeakersController } from './speakers.controller';
import { SpeakersRepository } from './speakers.repository';
import { SpeakersService } from './speakers.service';

@Module({
  imports: [DbModule],
  controllers: [SpeakersController],
  providers: [SpeakersService, SpeakersRepository],
})
export class SpeakersModule {}
