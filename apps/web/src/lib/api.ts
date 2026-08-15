import {
  currentUserSchema,
  eventDetailSchema,
  eventSchema,
  speakerDetailSchema,
  speakerSchema,
  type CurrentUser,
  type Event,
  type EventDetail,
  type Speaker,
  type SpeakerDetail,
} from '@eventflow/shared-types';

export class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export async function fetchSpeakers(): Promise<Speaker[]> {
  const res = await fetch('/api/speakers');
  if (!res.ok) throw new ApiError(res.status, 'Failed to fetch speakers');
  return speakerSchema.array().parse(await res.json());
}

export async function fetchSpeaker(id: string): Promise<SpeakerDetail> {
  const res = await fetch(`/api/speakers/${id}`);
  if (!res.ok) throw new ApiError(res.status, 'Failed to fetch speaker');
  return speakerDetailSchema.parse(await res.json());
}

export async function fetchEvents(): Promise<Event[]> {
  const res = await fetch('/api/events');
  if (!res.ok) throw new ApiError(res.status, 'Failed to fetch events');
  return eventSchema.array().parse(await res.json());
}

export async function fetchEventsVip(): Promise<Event[]> {
  const res = await fetch('/api/events/vip');
  if (!res.ok) throw new ApiError(res.status, 'Failed to fetch events');
  return eventSchema.array().parse(await res.json());
}

export async function fetchEvent(id: string): Promise<EventDetail> {
  const res = await fetch(`/api/events/${id}`);
  if (!res.ok) throw new ApiError(res.status, 'Failed to fetch event');
  return eventDetailSchema.parse(await res.json());
}

export async function fetchEventVip(id: string): Promise<EventDetail> {
  const res = await fetch(`/api/events/vip/${id}`);
  if (!res.ok) throw new ApiError(res.status, 'Failed to fetch event');
  return eventDetailSchema.parse(await res.json());
}

export async function fetchCurrentUser(): Promise<CurrentUser> {
  const res = await fetch('/api/users/me');
  if (!res.ok) throw new ApiError(res.status, 'Failed to fetch current user');
  return currentUserSchema.parse(await res.json());
}
