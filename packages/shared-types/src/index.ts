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

export const eventLocationSchema = z.object({
  city: z.string(),
  venue: z.string(),
  address: z.string(),
});

export const eventHeroSchema = z.object({
  image: z.string(),
  cta: z.string(),
});

export const eventSchema = z.object({
  id: z.string(),
  title: z.string(),
  subtitle: z.string(),
  date: z.string(),
  location: eventLocationSchema,
  hero: eventHeroSchema,
});

export type Event = z.infer<typeof eventSchema>;

export const eventSessionSchema = z.object({
  id: z.string(),
  title: z.string(),
  from: z.string(),
  to: z.string(),
  description: z.string(),
  level: z.string(),
  track: z.string(),
  room: z.string(),
  speaker: speakerSchema,
});

export type EventSession = z.infer<typeof eventSessionSchema>;

const speakerCardSchema = z.object({
  id: z.string(),
  type: z.literal('SpeakerCard'),
  data: z.object({
    name: z.string(),
    title: z.string(),
    image: z.string(),
  }),
  components: z.tuple([]),
});

export type SpeakerCardComponent = z.infer<typeof speakerCardSchema>;

const sessionCardSchema = z.object({
  id: z.string(),
  type: z.literal('SessionCard'),
  data: z.object({
    title: z.string(),
    subtitle: z.string(),
    description: z.string(),
    from: z.string(),
    to: z.string(),
    room: z.string(),
    speaker: z.object({
      id: z.string(),
      name: z.string(),
      title: z.string(),
      image: z.string(),
    }),
  }),
  components: z.tuple([]),
});

export type SessionCardComponent = z.infer<typeof sessionCardSchema>;

const headingSchema = z.object({
  id: z.string(),
  type: z.literal('Heading'),
  data: z.object({
    text: z.string(),
    level: z.enum(['h1', 'h2', 'h3', 'h4', 'h5', 'h6']),
  }),
  components: z.tuple([]),
});

export type HeadingComponent = z.infer<typeof headingSchema>;

const paragraphSchema = z.object({
  id: z.string(),
  type: z.literal('Paragraph'),
  data: z.object({
    text: z.string(),
  }),
  components: z.tuple([]),
});

export type ParagraphComponent = z.infer<typeof paragraphSchema>;

const speakerListSchema = z.object({
  id: z.string(),
  type: z.literal('SpeakerList'),
  data: z.object({
    title: z.string(),
  }),
  components: z.array(speakerCardSchema),
});

export type SpeakerListComponent = z.infer<typeof speakerListSchema>;

const sessionScheduleSchema = z.object({
  id: z.string(),
  type: z.literal('SessionSchedule'),
  data: z.object({
    title: z.string(),
  }),
  components: z.array(sessionCardSchema),
});

export type SessionScheduleComponent = z.infer<typeof sessionScheduleSchema>;

export interface SectionComponent {
  id: string;
  type: 'Section';
  data: { direction: 'row' | 'col' };
  components: LayoutComponent[];
}

// A Section's children can be any building block, including nested Sections,
// so its schema must reference the top-level union — z.lazy() breaks the
// circular definition that would otherwise be required at module-eval time.
const sectionSchema: z.ZodType<SectionComponent> = z.lazy(() =>
  z.object({
    id: z.string(),
    type: z.literal('Section'),
    data: z.object({ direction: z.enum(['row', 'col']) }),
    components: z.array(layoutComponentSchema),
  }),
);

// SpeakerCard/SessionCard are deliberately excluded here: the PRD only ever
// nests them under SpeakerList/SessionSchedule respectively, so they aren't
// valid as a freestanding building block anywhere a generic component is.
export type LayoutComponent =
  | SectionComponent
  | HeadingComponent
  | ParagraphComponent
  | SpeakerListComponent
  | SessionScheduleComponent;

// A plain union, not z.discriminatedUnion — Zod v4's discriminated union
// requires each member to carry concrete discriminant metadata that a
// z.lazy()-wrapped recursive branch (sectionSchema) doesn't expose to the
// type checker, even though it validates correctly at runtime.
export const layoutComponentSchema: z.ZodType<LayoutComponent> = z.lazy(() =>
  z.union([
    sectionSchema,
    headingSchema,
    paragraphSchema,
    speakerListSchema,
    sessionScheduleSchema,
  ]),
);

export const layoutSchema = z.object({
  id: z.string(),
  components: z.array(layoutComponentSchema),
});

export type Layout = z.infer<typeof layoutSchema>;

export const eventDetailSchema = eventSchema.extend({
  description: z.string(),
  organizer: z.object({
    name: z.string(),
    image: z.string(),
  }),
  sessions: eventSessionSchema.array(),
  speakers: speakerSchema.array(),
  layout: layoutSchema.nullable(),
});

export type EventDetail = z.infer<typeof eventDetailSchema>;

export const speakerEventSchema = z.object({
  id: z.string(),
  title: z.string(),
  date: z.string(),
});

export type SpeakerEvent = z.infer<typeof speakerEventSchema>;

export const speakerDetailSchema = speakerSchema.extend({
  events: speakerEventSchema.array(),
});

export type SpeakerDetail = z.infer<typeof speakerDetailSchema>;
