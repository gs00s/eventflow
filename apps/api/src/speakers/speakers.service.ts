import { Injectable } from '@nestjs/common';
import type { Speaker } from '@eventflow/shared-types';

const SPEAKERS: Speaker[] = [
  {
    id: 'dfed351e-0953-4d31-9856-1f56bcbfe939',
    name: 'Dr. Jane Doe',
    title: 'VP of Engineering, Example Corp',
    bio: 'Expert in serverless architectures and cloud-native development.',
    image: '...',
  },
];

@Injectable()
export class SpeakersService {
  findAll(): Speaker[] {
    return SPEAKERS;
  }
}
