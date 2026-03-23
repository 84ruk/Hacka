import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Nodo } from '../entities/nodo.entity';
import { Alerta } from '../entities/alerta.entity';
import { AccionProtocolo } from '../entities/accion-protocolo.entity';
import { SimulacionService } from './simulacion.service';
import { SimulacionController } from './simulacion.controller';
import { LogsModule } from '../logs/logs.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Nodo, Alerta, AccionProtocolo]),
    LogsModule,
  ],
  providers: [SimulacionService],
  controllers: [SimulacionController],
})
export class SimulacionModule {}
