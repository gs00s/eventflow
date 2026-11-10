import { createZodDto } from 'nestjs-zod';
import { eventInputSchema } from '@eventflow/shared-types';

export class EventInputDto extends createZodDto(eventInputSchema) {}
