import { Controller, Get, Param, ParseIntPipe } from '@nestjs/common';
import { LogsService } from './logs.service';

@Controller('logs')
export class LogsController {
  constructor(private readonly logsService: LogsService) {}

  @Get('nodo/:nodoId')
  getLogsNodo(@Param('nodoId', ParseIntPipe) nodoId: number) {
    return this.logsService.getLogsNodo(nodoId);
  }

  @Get('sede/:sede')
  getLogsSede(@Param('sede') sede: string) {
    return this.logsService.getLogsPorSede(decodeURIComponent(sede));
  }

  @Get('todos')
  getTodos() {
    return this.logsService.getTodos();
  }

  @Get('resumen')
  getResumen() {
    return this.logsService.getResumen();
  }

  @Get('c2')
  getLogsC2() {
    return this.logsService.getLogsC2();
  }
}
