import { Controller, Get, Query } from '@nestjs/common';
import { TimelineService } from './timeline.service';

@Controller('timeline')
export class TimelineController {
  constructor(private readonly svc: TimelineService) {}

  @Get()
  getTimeline(@Query('limite') limite?: string) {
    const n = limite ? parseInt(limite, 10) : 50;
    return this.svc.getTimeline(isNaN(n) ? 50 : n);
  }
}
