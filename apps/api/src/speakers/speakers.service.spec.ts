import { describe, expect, it } from 'vitest';
import { SpeakersService } from './speakers.service';

describe('SpeakersService', () => {
  it('returns the seeded speakers', () => {
    const service = new SpeakersService();

    const result = service.findAll();

    expect(result).toEqual([
      expect.objectContaining({
        id: 'dfed351e-0953-4d31-9856-1f56bcbfe939',
        name: 'Dr. Jane Doe',
      }),
    ]);
  });
});
