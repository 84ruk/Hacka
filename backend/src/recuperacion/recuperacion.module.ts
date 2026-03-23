import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Nodo } from '../entities/nodo.entity';
import { Alerta } from '../entities/alerta.entity';
import { AccionProtocolo } from '../entities/accion-protocolo.entity';
import { RecuperacionService } from './recuperacion.service';
import { RecuperacionController } from './recuperacion.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Nodo, Alerta, AccionProtocolo])],
  providers: [RecuperacionService],
  controllers: [RecuperacionController],
})
export class RecuperacionModule {}
