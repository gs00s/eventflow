import { Module } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { AuthModule } from '@thallesp/nestjs-better-auth';
import { LoggerModule } from 'nestjs-pino';
import { auth } from './auth/auth';
import { EventsModule } from './events/events.module';
import { AllExceptionsFilter } from './logging/all-exceptions.filter';
import { pinoConfig } from './logging/pino.config';
import { SpeakersModule } from './speakers/speakers.module';
import { UsersModule } from './users/users.module';

@Module({
  imports: [
    LoggerModule.forRoot(pinoConfig),
    AuthModule.forRoot({ auth }),
    EventsModule,
    SpeakersModule,
    UsersModule,
  ],
  providers: [{ provide: APP_FILTER, useClass: AllExceptionsFilter }],
})
export class AppModule {}
