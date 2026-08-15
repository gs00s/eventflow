import { Module } from '@nestjs/common';
import { AuthModule } from '@thallesp/nestjs-better-auth';
import { auth } from './auth/auth';
import { SpeakersModule } from './speakers/speakers.module';
import { UsersModule } from './users/users.module';

@Module({
  imports: [AuthModule.forRoot({ auth }), SpeakersModule, UsersModule],
})
export class AppModule {}
