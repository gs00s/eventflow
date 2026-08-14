import { speakerSchema, type Speaker } from '@eventflow/shared-types';

const API_URL = 'http://localhost:3000';

export async function fetchSpeakers(): Promise<Speaker[]> {
  const res = await fetch(`${API_URL}/speakers`);
  if (!res.ok) throw new Error('Failed to fetch speakers');
  return speakerSchema.array().parse(await res.json());
}
