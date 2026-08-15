import { speakerSchema, type Speaker } from '@eventflow/shared-types';

export async function fetchSpeakers(): Promise<Speaker[]> {
  const res = await fetch('/api/speakers');
  if (!res.ok) throw new Error('Failed to fetch speakers');
  return speakerSchema.array().parse(await res.json());
}
