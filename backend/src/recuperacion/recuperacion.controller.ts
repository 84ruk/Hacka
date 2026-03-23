import { Controller, Get, Param, ParseIntPipe, Patch } from '@nestjs/common';
import { RecuperacionService } from './recuperacion.service';

@Controller('recuperacion')
export class RecuperacionController {
  constructor(private readonly svc: RecuperacionService) {}

  @Get('nodos-contenidos')
  getNodosContenidos() {
    return this.svc.getNodosContenidos();
  }

  @Get('checklist/:nodoId')
  getChecklist(@Param('nodoId', ParseIntPipe) nodoId: number) {
    return this.svc.getChecklist(nodoId);
  }

  @Patch('checklist/:nodoId/paso/:orden')
  completarPaso(
    @Param('nodoId', ParseIntPipe) nodoId: number,
    @Param('orden', ParseIntPipe) orden: number,
  ) {
    return this.svc.completarPaso(nodoId, orden);
  }

  @Get('metricas')
  getMetricas() {
    return this.svc.getMetricas();
  }

  @Get('reporte')
  getReporte() {
    return this.svc.getReporte();
  }
}
