import {
  currentUserSchema,
  speakerSchema,
  type CurrentUser,
  type Speaker,
} from '@eventflow/shared-types';

export async function fetchSpeakers(): Promise<Speaker[]> {
  const res = await fetch('/api/speakers');
  if (!res.ok) throw new Error('Failed to fetch speakers');
  return speakerSchema.array().parse(await res.json());
}

export async function fetchCurrentUser(): Promise<CurrentUser> {
  const res = await fetch('/api/users/me');
  if (!res.ok) throw new Error('Failed to fetch current user');
  return currentUserSchema.parse(await res.json());
}
