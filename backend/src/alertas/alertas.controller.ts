import { Controller, Get, Param, ParseIntPipe, Patch, Query } from '@nestjs/common';
import { AlertasService } from './alertas.service';
import { SeveridadAlerta } from '../entities/alerta.entity';

@Controller('alertas')
export class AlertasController {
  constructor(private readonly alertasService: AlertasService) {}

  // GET /alertas/resumen — antes de /:id para no capturarse como id='resumen'
  @Get('resumen')
  getResumen() {
    return this.alertasService.getResumen();
  }

  // PATCH /alertas/sede/:sede/atender-todas — antes de /:id
  @Patch('sede/:sede/atender-todas')
  atenderSede(@Param('sede') sede: string) {
    return this.alertasService.atenderSede(sede);
  }

  @Get()
  findAll(
    @Query('atendida')  atendida?: string,
    @Query('severidad') severidad?: SeveridadAlerta,
    @Query('sede')      sede?: string,
    @Query('limite')    limite?: string,
  ) {
    return this.alertasService.findAll({
      atendida:  atendida !== undefined ? atendida === 'true' : undefined,
      severidad,
      sede,
      limite:    limite ? parseInt(limite, 10) : undefined,
    });
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.alertasService.findOne(id);
  }

  @Patch(':id/atender')
  atender(@Param('id', ParseIntPipe) id: number) {
    return this.alertasService.atender(id);
  }
}
