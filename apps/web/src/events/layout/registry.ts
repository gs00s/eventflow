import type { ComponentType } from 'react';
import type { LayoutComponent } from '@eventflow/shared-types';
import { Heading } from './heading';
import { Paragraph } from './paragraph';
import { Section } from './section';
import { SessionSchedule } from './session-schedule';
import { SpeakerList } from './speaker-list';

// The gate: every LayoutComponent type must have an entry here, and every
// entry must accept exactly that type's narrowed props — add or remove a
// building block from the shared-types union and TS forces this to follow.
export const layoutComponentRegistry: {
  [K in LayoutComponent['type']]: ComponentType<{
    component: Extract<LayoutComponent, { type: K }>;
  }>;
} = {
  Section,
  Heading,
  Paragraph,
  SpeakerList,
  SessionSchedule,
};
