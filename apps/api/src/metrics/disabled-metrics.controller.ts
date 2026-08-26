import { Controller, Get, NotFoundException, Res } from '@nestjs/common';
import { PrometheusController } from '@willsoto/nestjs-prometheus';
import type { Response } from 'express';

// PrometheusModule.register() always mounts a controller here; real metrics live on main.ts's internal port instead.
@Controller()
export class DisabledMetricsController extends PrometheusController {
  @Get()
  override index(@Res({ passthrough: true }) _response: Response): never {
    throw new NotFoundException();
  }
}
