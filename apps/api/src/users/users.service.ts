import { Injectable } from '@nestjs/common';
import type { UserSession } from '@thallesp/nestjs-better-auth';
import type { CurrentUser } from '@eventflow/shared-types';
import type { auth } from '../auth/auth';

@Injectable()
export class UsersService {
  getCurrentUser(session: UserSession<typeof auth>): CurrentUser {
    return {
      id: session.user.id,
      email: session.user.email,
      name: session.user.name,
      isVip: session.user.isVip,
    };
  }
}
