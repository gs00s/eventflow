import { Injectable } from '@nestjs/common';
import type { Speaker } from '@eventflow/shared-types';
import { SpeakersRepository } from './speakers.repository';

@Injectable()
export class SpeakersService {
  constructor(private readonly speakersRepository: SpeakersRepository) {}

  async findAll(): Promise<Speaker[]> {
    const rows = await this.speakersRepository.findAll();

    return rows.map((row) => ({
      id: row.id,
      name: row.name,
      title: row.title,
      bio: row.bio,
      image: row.image,
    }));
  }
}
