import { Module } from '@nestjs/common';
import { AuthModule } from '@thallesp/nestjs-better-auth';
import { auth } from './auth/auth';
import { EventsModule } from './events/events.module';
import { SpeakersModule } from './speakers/speakers.module';
import { UsersModule } from './users/users.module';

@Module({
  imports: [AuthModule.forRoot({ auth }), EventsModule, SpeakersModule, UsersModule],
})
export class AppModule {}
