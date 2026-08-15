import type { ComponentType } from 'react';
import type { LayoutComponent } from '@eventflow/shared-types';
import { Heading } from './heading';
import { Paragraph } from './paragraph';
import { Section } from './section';
import { SessionSchedule } from './session-schedule';
import { SpeakerList } from './speaker-list';

// Every LayoutComponent type must map to a component accepting that exact narrowed props type.
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
