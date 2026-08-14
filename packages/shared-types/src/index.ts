import * as z from 'zod';

export const speakerSchema = z.object({
  id: z.string(),
  name: z.string(),
  title: z.string(),
  bio: z.string(),
  image: z.string(),
});

export type Speaker = z.infer<typeof speakerSchema>;
