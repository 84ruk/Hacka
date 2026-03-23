import { Controller, Delete, Post } from '@nestjs/common';
import { SimulacionService } from './simulacion.service';

@Controller('simulacion')
export class SimulacionController {
  constructor(private readonly simulacionService: SimulacionService) {}

  @Post('iniciar')
  iniciar() {
    return this.simulacionService.iniciar();
  }

  @Post('iniciar-limpio')
  iniciarLimpio() {
    return this.simulacionService.iniciarLimpio();
  }

  @Post('propagar')
  propagar() {
    return this.simulacionService.propagar();
  }

  @Delete('reset')
  async reset() {
    return this.simulacionService.resetAtaque();
  }
}
