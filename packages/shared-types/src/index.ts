import * as z from 'zod';

export const speakerSchema = z.object({
  id: z.string(),
  name: z.string(),
  title: z.string(),
  bio: z.string(),
  image: z.string(),
});

export type Speaker = z.infer<typeof speakerSchema>;

export const currentUserSchema = z.object({
  id: z.string(),
  email: z.string(),
  name: z.string(),
});

export type CurrentUser = z.infer<typeof currentUserSchema>;
