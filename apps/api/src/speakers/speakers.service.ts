import { Injectable } from '@nestjs/common';
import type { Speaker, SpeakerEvent } from '@eventflow/shared-types';
import { SpeakersRepository } from './speakers.repository';

@Injectable()
export class SpeakersService {
  constructor(private readonly speakersRepository: SpeakersRepository) {}

  async findAll(): Promise<Speaker[]> {
    const rows = await this.speakersRepository.findAll();

    return rows.map(toSpeaker);
  }

  async findById(id: string): Promise<Speaker | undefined> {
    const row = await this.speakersRepository.findById(id);
    if (!row) return undefined;

    return toSpeaker(row);
  }

  exists(id: string): Promise<boolean> {
    return this.speakersRepository.exists(id);
  }

  async findPublicEvents(speakerId: string): Promise<SpeakerEvent[]> {
    const sessions = await this.speakersRepository.findEvents(speakerId);

    return toSpeakerEvents(sessions.filter(({ event }) => !event.isVip));
  }

  async findAllEvents(speakerId: string): Promise<SpeakerEvent[]> {
    const sessions = await this.speakersRepository.findEvents(speakerId);

    return toSpeakerEvents(sessions);
  }
}

function toSpeaker(row: {
  id: string;
  name: string;
  title: string;
  bio: string;
  image: string;
}): Speaker {
  return {
    id: row.id,
    name: row.name,
    title: row.title,
    bio: row.bio,
    image: row.image,
  };
}

function toSpeakerEvents(
  sessions: { event: { id: string; title: string; date: string } }[],
): SpeakerEvent[] {
  const eventsById = new Map(sessions.map(({ event }) => [event.id, event]));

  return [...eventsById.values()].map((event) => ({
    id: event.id,
    title: event.title,
    date: event.date,
  }));
}
