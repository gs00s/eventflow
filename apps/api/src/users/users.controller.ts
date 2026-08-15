import { Controller, Get } from '@nestjs/common';
import { Session, type UserSession } from '@thallesp/nestjs-better-auth';
import type { CurrentUser } from '@eventflow/shared-types';
import type { auth } from '../auth/auth';
import { UsersService } from './users.service';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  getMe(@Session() session: UserSession<typeof auth>): CurrentUser {
    return this.usersService.getCurrentUser(session);
  }
}
