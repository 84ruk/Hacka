import { Controller, Get, Param, ParseIntPipe, Post } from '@nestjs/common';
import { AnalisisService } from './analisis.service';

@Controller('analisis')
export class AnalisisController {
  constructor(private readonly analisisService: AnalisisService) {}

  @Get('red')
  analizarRed() {
    return this.analisisService.analizarRed();
  }

  @Get('propagacion')
  analizarPropagacion() {
    return this.analisisService.analizarPropagacion();
  }

  @Get('recomendaciones')
  getRecomendaciones() {
    return this.analisisService.getRecomendaciones();
  }

  @Post('nodo/:id')
  analizarNodo(@Param('id', ParseIntPipe) id: number) {
    return this.analisisService.analizarNodo(id);
  }

  @Post('contener-automatico')
  contenerAutomatico() {
    return this.analisisService.contenerAutomatico();
  }

  @Post('escanear')
  escanear() {
    return this.analisisService.escanear();
  }

  @Get('paciente-cero')
  pacienteCero() {
    return this.analisisService.pacienteCero();
  }
}
