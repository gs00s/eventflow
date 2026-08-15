import { Injectable } from '@nestjs/common';
import type { Speaker, SpeakerDetail } from '@eventflow/shared-types';
import { SpeakersRepository } from './speakers.repository';

@Injectable()
export class SpeakersService {
  constructor(private readonly speakersRepository: SpeakersRepository) {}

  async findAll(): Promise<Speaker[]> {
    const rows = await this.speakersRepository.findAll();

    return rows.map(toSpeaker);
  }

  async findById(id: string): Promise<SpeakerDetail | undefined> {
    const row = await this.speakersRepository.findById(id);
    if (!row) return undefined;

    const eventsById = new Map(row.sessions.map(({ event }) => [event.id, event]));

    return {
      ...toSpeaker(row),
      events: [...eventsById.values()].map((event) => ({
        id: event.id,
        title: event.title,
        date: event.date,
      })),
    };
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
